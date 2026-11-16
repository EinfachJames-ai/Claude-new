#!/usr/bin/env python3
"""Build the deployable site into dist/ and pack jk-unique-website.zip.

- minifies styles.css and script.js with esbuild (via npx)
- appends a content hash (?v=...) to their URLs so they can be cached for a year
- copies everything else unchanged

Usage: python3 tools/build.py
"""
import hashlib
import re
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
ZIP = ROOT / 'jk-unique-website.zip'

FILES = ['index.html', '404.html', 'favicon.ico', 'robots.txt', 'sitemap.xml',
         'site.webmanifest', '_headers', 'og-image.png']
DIRS = ['fonts', 'icons', 'rechtliches']
LOGOS = ['mark.webp', 'logo.webp', 'jk-unique-logo.png']
ESBUILD = ['npx', '-y', 'esbuild@0.24.0']


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    for f in FILES:
        shutil.copy2(ROOT / f, DIST / f)
    for d in DIRS:
        shutil.copytree(ROOT / d, DIST / d)
    (DIST / 'logo').mkdir()
    for f in LOGOS:
        shutil.copy2(ROOT / 'logo' / f, DIST / 'logo' / f)

    versions = {}
    for name in ['styles.css', 'script.js']:
        out = DIST / name
        subprocess.run(ESBUILD + [str(ROOT / name), '--minify', '--log-level=warning', f'--outfile={out}'],
                       check=True, cwd=ROOT)
        versions[name] = hashlib.sha256(out.read_bytes()).hexdigest()[:10]
        print(f'{name}: {(ROOT / name).stat().st_size} -> {out.stat().st_size} bytes')

    for html in DIST.rglob('*.html'):
        text = html.read_text(encoding='utf-8')
        for name, v in versions.items():
            text, n = re.subn(r'((?:href|src)="[./]*)' + re.escape(name) + '"', r'\g<1>' + name + '?v=' + v + '"', text)
            assert n == 1 or (n == 0 and name == 'script.js'), (html, name, n)
        html.write_text(text, encoding='utf-8')

    if ZIP.exists():
        ZIP.unlink()
    with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(DIST.rglob('*')):
            if p.is_file():
                z.write(p, p.relative_to(DIST).as_posix())
    total = sum(p.stat().st_size for p in DIST.rglob('*') if p.is_file())
    print(f'dist: {total} bytes, zip: {ZIP.stat().st_size} bytes')


if __name__ == '__main__':
    main()
