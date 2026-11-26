import { createRequire } from 'node:module';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { parse as parseHtml } from 'parse5';

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const [profile, source, target] = process.argv.slice(2);
if (!['chenyaun-v2', 'shie', 'reborn-2020'].includes(profile) || !source || !target) {
  throw new Error('Usage: node scripts/prepare-game-html.mjs <profile> <source.html> <target.html>');
}

function* scripts(node) {
  if (node.tagName === 'script' && node.sourceCodeLocation?.endTag && node.attrs.every(attr => attr.name !== 'src')) {
    yield node.sourceCodeLocation;
  }
  for (const child of node.childNodes ?? []) yield* scripts(child);
}

function traverse(node, visit) {
  if (typeof node?.type !== 'string') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => traverse(child, visit));
    else traverse(value, visit);
  }
}

let html = await readFile(source, 'utf8');
if (profile === 'shie') {
  html = html.replace(' onclick="installChip(\'${chip.id}\')"', '');
  html = html.replace('    container.appendChild(card);', "    card.querySelector('.chip-btn').addEventListener('click', () => installChip(chip.id));\n    container.appendChild(card);");
  html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', './vendor/three.min.js');
}

const patches = [];
for (const { startTag, endTag } of scripts(parseHtml(html, { sourceCodeLocationInfo: true }))) {
  const script = html.slice(startTag.endOffset, endTag.startOffset);
  traverse(parse(script, { ecmaVersion: 'latest' }), node => {
    if (node.type !== 'AssignmentExpression' || node.operator !== '=') return;
    const { left, right } = node;
    if (left.type !== 'MemberExpression' || left.computed || left.property.name !== 'innerHTML') return;
    if (right.type === 'Literal' && right.value === '') return;
    if (right.type === 'CallExpression' && right.callee.object?.name === 'DOMPurify' && right.callee.property?.name === 'sanitize') return;

    const receiver = script.slice(left.object.start, left.object.end);
    const markup = script.slice(right.start, right.end);
    const context = receiver === 'svgEl' ? 'svg' : receiver === 'tr' ? 'tr' : 'html';
    patches.push([startTag.endOffset + node.start, startTag.endOffset + node.end,
      `${receiver}.replaceChildren(...releaseMarkup(${markup}, ${JSON.stringify(context)}))`]);
  });
}

for (const [start, end, replacement] of patches.sort((a, b) => b[0] - a[0])) {
  html = html.slice(0, start) + replacement + html.slice(end);
}

const vendors = ['<script src="./vendor/purify.min.js"></script>'];
if (profile === 'reborn-2020') {
  vendors.push('<script src="./vendor/acorn.js"></script>', '<script src="./vendor/reborn-actions.js"></script>');
}
vendors.push('<script src="./vendor/release-markup.js"></script>');
html = html.replace('</head>', `${vendors.join('\n')}\n</head>`);

const vendor = join(dirname(resolve(target)), 'vendor');
await mkdir(vendor, { recursive: true });
const purifier = dirname(require.resolve('dompurify'));
const acorn = dirname(require.resolve('acorn'));
const three = dirname(require.resolve('three'));
await Promise.all([
  writeFile(target, html, 'utf8'),
  copyFile(join(purifier, 'purify.min.js'), join(vendor, 'purify.min.js')),
  copyFile(join(purifier, 'purify.min.js.map'), join(vendor, 'purify.min.js.map')),
  copyFile(join(purifier, '..', 'LICENSE'), join(vendor, 'dompurify-LICENSE.txt')),
  copyFile(join(scriptDir, '..', 'deployment', 'release-markup.js'), join(vendor, 'release-markup.js')),
  ...(profile === 'reborn-2020' ? [
    copyFile(join(acorn, 'acorn.js'), join(vendor, 'acorn.js')),
    copyFile(join(acorn, '..', 'LICENSE'), join(vendor, 'acorn-LICENSE.txt')),
    copyFile(join(scriptDir, '..', 'deployment', 'reborn-action-bindings.js'), join(vendor, 'reborn-actions.js')),
  ] : []),
  ...(profile === 'shie' ? [
    copyFile(join(three, 'three.min.js'), join(vendor, 'three.min.js')),
    copyFile(join(three, '..', 'LICENSE'), join(vendor, 'three-LICENSE.txt')),
  ] : []),
]);
console.log(`${profile}: ${patches.length} HTML updates use sanitized fragments`);
