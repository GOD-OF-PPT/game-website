import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import mime from 'mime';

const [mode, rootPath, indexFile] = process.argv.slice(2);
if (!['index', 'upload'].includes(mode) || !rootPath || !indexFile) {
  throw new Error('Usage: cloudflare-assets.mjs <index|upload> <asset directory> <index file>');
}
const root = resolve(rootPath);

function assetHash(content, extension) {
  return createHash('sha256').update(content.toString('base64') + extension).digest('hex').slice(0, 32);
}

async function listFiles(dir, prefix = '') {
  const assets = [];
  for (const file of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!prefix && ['_headers', '_redirects'].includes(file.name)) continue;
    if (file.isSymbolicLink()) throw new Error('Symbolic link in static assets');
    const relative = `${prefix}/${file.name}`;
    const local = join(dir, file.name);
    if (file.isDirectory()) {
      assets.push(...await listFiles(local, relative));
    } else if (file.isFile()) {
      const content = await readFile(local);
      if (content.length > 25 * 1024 * 1024) throw new Error(`Asset exceeds 25 MiB: ${relative}`);
      assets.push([relative, { hash: assetHash(content, extname(file.name)), size: content.length }]);
    }
  }
  return assets;
}

async function upload() {
  const files = JSON.parse(await readFile(indexFile, 'utf8'));
  const byHash = new Map(files.map(([name, { hash }]) => [hash, name]));
  // The scoped, short-lived upload grant arrives on standard input and is
  // never put on the command line, saved to disk, or included in diagnostics.
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  const input = createInterface({ input: process.stdin, terminal: false });
  const line = await new Promise((accept, reject) => {
    input.once('line', accept);
    input.once('close', () => reject(new Error('Missing upload grant')));
  });
  input.close();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
  const { account, jwt, buckets } = JSON.parse(line);
  if (!/^[a-f0-9]{32}$/.test(account) || !jwt || !Array.isArray(buckets)) throw new Error('Invalid upload grant');
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/assets/upload?base64=true`;
  let completion = buckets.length === 0 ? jwt : undefined;
  for (const bucket of buckets) {
    const form = new FormData();
    for (const hash of bucket) {
      const name = byHash.get(hash);
      if (!name) throw new Error(`Unknown asset in upload bucket: ${hash}`);
      const bytes = await readFile(join(root, name.slice(1)));
      if (assetHash(bytes, extname(name)) !== hash) throw new Error(`Asset changed after indexing: ${name}`);
      form.append(hash, new Blob([bytes.toString('base64')], { type: mime.getType(name) ?? 'application/octet-stream' }), hash);
    }
    const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: form, signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`Asset upload HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.success) throw new Error('Cloudflare rejected an asset bucket');
    if (payload.result?.jwt) completion = payload.result.jwt;
    console.log(`Uploaded ${bucket.length} assets`);
  }
  if (!completion) throw new Error('Cloudflare did not issue a completion grant');
  console.log(`CF_UPLOAD_RESULT=${completion}`);
}

if (mode === 'index') {
  const assets = await listFiles(root);
  await writeFile(indexFile, JSON.stringify(assets));
  console.log(`Indexed ${assets.length} assets`);
} else {
  await upload();
}
