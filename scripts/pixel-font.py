"""Subset PoxiaoPixel for the mascot bubble; requires fontTools and brotli.

Run `python scripts/pixel-font.py <poxiao-pixel-12px-square.ttf>` by hand.
The family is renamed as the SIL OFL requires for a modified font.
"""

import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
COPY = ROOT / 'packages/client/src/features/mascot/mascot.copy.json'
OUT = ROOT / 'packages/assets/src/fonts/ClaudeStylePixel.woff2'
FAMILY = 'Claude Style Pixel'
LABEL_KEYS = ('mascotBalanceLabel', 'mascotSessionLabel')
# The figures: formatMoneyMicro's digits, point and dash, both currency signs,
# and the minus an overdrawn balance carries.
FIGURES = '0123456789.-—¥$'


def bubble_text():
    copy = json.loads(COPY.read_text(encoding='utf-8'))
    labels = ''.join(copy[key][lang] for key in LABEL_KEYS for lang in ('zh', 'en'))
    return ''.join(sorted(set(labels + FIGURES)))


def main():
    if len(sys.argv) != 2:
        sys.exit('usage: python scripts/pixel-font.py <poxiao-pixel-12px-square.ttf>')
    text = bubble_text()
    font = TTFont(sys.argv[1])
    cmap = font.getBestCmap()
    missing = [ch for ch in text if ord(ch) not in cmap]
    if missing:
        sys.exit(f'pixel-font: the source has no glyph for {missing!r}')
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = []
    options.hinting = False
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    names = font['name']
    names.setName(FAMILY, 1, 3, 1, 0x409)
    names.setName('Regular', 2, 3, 1, 0x409)
    names.setName(f'{FAMILY}; subset of PoxiaoPixel', 3, 3, 1, 0x409)
    names.setName(FAMILY, 4, 3, 1, 0x409)
    names.setName(FAMILY.replace(' ', ''), 6, 3, 1, 0x409)
    names.names = [record for record in names.names if record.platformID == 3]
    font.flavor = 'woff2'
    font.save(OUT)
    print(f'{OUT.relative_to(ROOT)}: {len(text)} characters, {OUT.stat().st_size} bytes')


if __name__ == '__main__':
    main()
