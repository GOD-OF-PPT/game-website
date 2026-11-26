import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path, PurePosixPath
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


SCRIPTS = Path(__file__).resolve().parent
EXCLUDED = set(json.loads((SCRIPTS / 'static-scan-scope.json').read_text(encoding='utf-8')))
MAX_ASSET_SIZE = 25 * 1024 * 1024
FREE_WORKER_ASSET_LIMIT = 20_000


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def snapshot(source, destination, max_files):
    def copy_directory(directory):
        for child in sorted(directory.iterdir()):
            if child.is_dir() and child.name in EXCLUDED:
                continue
            relative = child.relative_to(source)
            if child.is_symlink() or child.is_junction():
                raise ValueError(f'Linked path in package: {relative.as_posix()}')
            if child.is_dir():
                (destination / relative).mkdir()
                copy_directory(child)
                continue
            if not child.is_file():
                raise ValueError(f'Unsupported path in package: {relative.as_posix()}')
            name = relative.as_posix()
            if name.casefold() in names:
                raise ValueError(f'Case-insensitive duplicate path: {name}')
            if len(files) >= max_files:
                raise ValueError(f'Package exceeds the selected limit of {max_files} files')
            size = child.stat().st_size
            if size > MAX_ASSET_SIZE:
                raise ValueError(f'Asset exceeds the 25 MiB limit: {name} ({size} bytes)')
            copied = destination / relative
            shutil.copyfile(child, copied)
            if copied.stat().st_size != size:
                raise ValueError(f'Asset changed during snapshot: {name}')
            names.add(name.casefold())
            files.append({'path': name, 'size': size, 'sha256': sha256(copied)})

    files = []
    names = set()
    destination.mkdir()
    copy_directory(source)
    return sorted(files, key=lambda item: item['path'])


def pack_verified(stage, files, archive):
    with ZipFile(archive, 'w') as zipped:
        for item in files:
            info = ZipInfo(item['path'])
            info.compress_type = ZIP_DEFLATED
            with (stage / item['path']).open('rb') as source, zipped.open(info, 'w') as target:
                shutil.copyfileobj(source, target)
    with ZipFile(archive) as zipped:
        if zipped.namelist() != [item['path'] for item in files]:
            raise ValueError('ZIP paths differ from the scanned snapshot')
        for item in files:
            with zipped.open(item['path']) as member:
                digest = hashlib.file_digest(member, 'sha256').hexdigest()
            if zipped.getinfo(item['path']).file_size != item['size'] or digest != item['sha256']:
                raise ValueError(f'ZIP asset differs from the scanned snapshot: {item["path"]}')


def create_package(source, output, entry, max_files):
    output.mkdir(parents=True)
    pending = output / 'static.zip.pending'
    try:
        with TemporaryDirectory(prefix='xsj-static-') as scratch:
            stage = Path(scratch) / source.name
            files = snapshot(source, stage, max_files)
            if entry not in {item['path'] for item in files}:
                raise ValueError(f'Entry file is missing from the snapshot: {entry}')
            scan = subprocess.run(
                ['node', str(SCRIPTS / 'scan-static-web.mjs'), str(stage), str(output / 'scan')],
                check=False,
            )
            if scan.returncode:
                raise ValueError(f'Static scan failed, see reports in {output}')
            pack_verified(stage, files, pending)
            manifest = {
                'source': str(source),
                'entry': entry,
                'archive': {'path': 'static.zip', 'size': pending.stat().st_size, 'sha256': sha256(pending)},
                'fileCount': len(files),
                'files': files,
            }
            (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            archive = pending.replace(output / 'static.zip')
    finally:
        pending.unlink(missing_ok=True)
    return archive


def main():
    parser = argparse.ArgumentParser(description='Scan a static Web release and write a verified Cloudflare-ready ZIP.')
    parser.add_argument('source', type=Path, help='directory containing the built static site')
    parser.add_argument('output', type=Path, help='new directory for the ZIP, manifest and scan reports')
    parser.add_argument('--entry', default='index.html', help='relative path to the HTML game entry')
    parser.add_argument('--max-files', type=int, default=FREE_WORKER_ASSET_LIMIT, help='asset budget for the target Worker')
    args = parser.parse_args()
    source, output = args.source.resolve(), args.output.resolve()
    entry = PurePosixPath(args.entry)
    if not source.is_dir():
        parser.error('source must be a directory')
    if output.is_relative_to(source):
        parser.error('output must be outside the source directory')
    if entry.is_absolute() or '..' in entry.parts or '\\' in args.entry or entry.suffix.lower() not in {'.html', '.htm'}:
        parser.error('entry must be a relative HTML path with forward slashes')
    if args.max_files < 1:
        parser.error('max-files must be positive')
    try:
        archive = create_package(source, output, entry.as_posix(), args.max_files)
    except (OSError, ValueError) as error:
        print(error, file=sys.stderr)
        return 1
    print(f'Verified ZIP: {archive}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
