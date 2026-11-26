"""Prepare the Mota web release for cold caches and slow connections."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import shutil

from PIL import Image


def compact(path):
    output = path.with_suffix('.webp')
    if output.exists():
        return None
    with Image.open(path) as picture:
        pixels = picture.convert('RGBA')
        profile = picture.info.get('icc_profile')
        pixels.save(output, 'WEBP', lossless=True, method=3, exact=True, icc_profile=profile)
    with Image.open(output) as result:
        decoded = result.convert('RGBA')
        if decoded.size != pixels.size or decoded.tobytes() != pixels.tobytes():
            raise ValueError(f'Pixel mismatch after converting {path}')
    before, after = path.stat().st_size, output.stat().st_size
    if after >= before:
        output.unlink()
        return None
    return path, output, before, after


def allow_play_during_preload(path):
    source = path.read_text(encoding='utf-8')
    disable = "$('new-game').disabled=true;$('continue-game').disabled=true;"
    done = "finally{assetsLoading=false;$('new-game').disabled=false;$('continue-game').disabled=!engine.hasSave()||runSession.isTrial&&runSession.meta.rulesHash!==runSession.trial.rulesHash;renderHUD();}"
    progress = "$('asset-status').textContent='正在展开'+styleLabel()+'画卷';"
    for fragment in (disable, done, progress):
        if source.count(fragment) != 1:
            raise ValueError('Unexpected upstream asset preload implementation')
    source = source.replace(disable, disable + """
    const enablePlay=()=>{
      assetsLoading=false;
      $('new-game').disabled=false;
      $('continue-game').disabled=!engine.hasSave()||runSession.isTrial&&runSession.meta.rulesHash!==runSession.trial.rulesHash;
    };
    const slowPreload=setTimeout(()=>{
      enablePlay();
      $('asset-status').textContent='可先入塔，画卷将继续加载';
    },5000);
""")
    source = source.replace(progress, "$('asset-status').textContent=assetsLoading?'正在展开'+styleLabel()+'画卷':'可先入塔，画卷将继续加载';")
    source = source.replace(done, 'finally{clearTimeout(slowPreload);enablePlay();renderHUD();}')
    path.write_text(source, encoding='utf-8', newline='\n')


def release(source, stage):
    if stage.is_relative_to(source):
        raise ValueError('Output must be outside the source directory')
    shutil.copytree(source, stage)
    markup = {path: path.read_text(encoding='utf-8') for path in stage.rglob('*') if path.suffix in {'.js', '.css', '.html'}}
    startup = markup[stage / 'js' / 'material-assets.js']
    candidates = [path for path in (stage / 'assets' / 'material').rglob('*.png') if path.relative_to(stage).as_posix() in startup]
    with ThreadPoolExecutor(max_workers=4) as pool:
        converted = [item for item in pool.map(compact, candidates) if item]
    for path, before in markup.items():
        contents = before
        for old, new, _, _ in converted:
            contents = contents.replace(old.relative_to(stage).as_posix(), new.relative_to(stage).as_posix())
        if contents != before:
            path.write_text(contents, encoding='utf-8', newline='\n')
    for path, _, _, _ in converted:
        path.unlink()
    allow_play_during_preload(stage / 'js' / 'ui.js')
    original_bytes = sum(item[2] for item in converted)
    release_bytes = sum(item[3] for item in converted)
    print(f'{len(converted)} pixel-verified atlases: {original_bytes} -> {release_bytes} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('stage', type=Path)
    args = parser.parse_args()
    release(args.source.resolve(), args.stage.resolve())
