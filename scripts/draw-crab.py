"""Draw the composer crab's animation sheets (packages/assets/src/mascot/crab/).

Run by hand after changing a drawing; the build never runs it:

    python scripts/draw-crab.py

Needs Pillow. The crab is drawn on a 52x36 grid of cells, one pixel a cell,
feet on the bottom row and the right claw four columns in from the right
edge (the room a lean, a note or a sparkle takes on that side) — the stance
of Claude Code's own crab, whose laptop routine (packages/assets/src/mascot/
crab-laptop-body.png and crab-laptop-ink.png, 34x23 cells a frame: the crab
pulls out a laptop, types, and puts it away) is laid onto the same grid for the
typing animations. Every animation is written as two sheets: `<key>.png`
carries the shell, its shaded side and the eyes in their colours;
`<key>-ink.png` is a mask the stylesheet fills with the theme's quiet ink
(the laptop, thought dots, letters, notes, the hat). A sheet holds eight
frames to a row, each cropped to the smallest box that holds every frame of
that animation. The script prints the CRAB_SHEETS table packages/client/src/constants.js
carries.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets', 'mascot', 'crab')
LEGACY_BODY = os.path.join(ROOT, 'src', 'assets', 'mascot', 'crab-laptop-body.png')
LEGACY_INK = os.path.join(ROOT, 'src', 'assets', 'mascot', 'crab-laptop-ink.png')

W, H = 52, 36
COLOURS = {'A': (0xd9, 0x77, 0x57, 255), 'B': (0x14, 0x14, 0x13, 255), 'C': (0xb9, 0x60, 0x3f, 255)}

# The resting crab: the shell's top-left cell. Shell 16x12, claws 4x4 on each
# side four rows down, eyes 2x2 two rows down, four legs 2x4 under the shell.
C0, R0 = 28, 20


class Frame:
    def __init__(self):
        self.body = {}
        self.ink = set()

    def put(self, x, y, colour):
        if 0 <= x < W and 0 <= y < H:
            self.body[(x, y)] = colour
            self.ink.discard((x, y))

    def rect(self, x, y, w, h, colour='A'):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.put(xx, yy, colour)

    def clear(self, x, y, w, h):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.body.pop((xx, yy), None)

    def mark(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            self.ink.add((x, y))

    def glyph(self, x, y, rows):
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == '#':
                    self.mark(x + dx, y + dy)


GLYPHS = {
    'z': ['####', '..#.', '.#..', '####'],
    'Z': ['#####', '...#.', '..#..', '.#...', '#####'],
    '!': ['##', '##', '##', '##', '..', '##'],
    '?': ['.###.', '#...#', '...#.', '..#..', '.....', '..#..'],
    'note': ['.###', '.#.#', '.#..', '.#..', '##..', '##..'],
    'spark': ['.#.', '###', '.#.'],
    'dot': ['##', '##'],
    'small': ['#'],
    'x': ['#.#', '.#.', '#.#'],
    'bubble': ['.#########.', '#.........#', '#.........#', '#.........#', '.#########.'],
}


def crab(f, dx=0, dy=0, eyes='open', left='rest', right='rest', legs='stand', squish=0, shade=False):
    """The front-facing crab, moved by (dx, dy). `squish` presses the shell
    down by that many rows and widens it by as many columns on each side."""
    c, r = C0 + dx, R0 + dy
    top = r + squish
    f.rect(c - squish, top, 16 + 2 * squish, 12 - squish)
    if shade:
        f.rect(c + 14 + squish, top, 2, 12 - squish, 'C')
    arm_row = r + 4 + squish // 2
    for side, pose in (('left', left), ('right', right)):
        x = c - 4 - squish if side == 'left' else c + 16 + squish
        if pose == 'rest':
            f.rect(x, arm_row, 4, 4)
        elif pose == 'up':
            f.rect(x, arm_row - 6, 4, 4)
            f.rect(x + (2 if side == 'left' else 0), arm_row - 2, 2, 2)
        elif pose == 'high':
            f.rect(x, arm_row - 9, 4, 4)
            f.rect(x + (2 if side == 'left' else 0), arm_row - 5, 2, 5)
        elif pose == 'down':
            f.rect(x, arm_row + 3, 4, 4)
        elif pose == 'mid':
            f.rect(x, arm_row - 3, 4, 4)
            f.rect(x + (2 if side == 'left' else 0), arm_row + 1, 2, 1)
    ey = r + 2 + squish
    for ex in (c + 2, c + 12):
        if eyes == 'open':
            f.rect(ex, ey, 2, 2, 'B')
        elif eyes == 'shut':
            f.rect(ex, ey + 1, 2, 1, 'B')
        elif eyes == 'up':
            f.rect(ex, ey - 1, 2, 2, 'B')
        elif eyes == 'upleft':
            f.rect(ex - 1, ey - 1, 2, 2, 'B')
        elif eyes == 'left':
            f.rect(ex - 1, ey, 2, 2, 'B')
        elif eyes == 'right':
            f.rect(ex + 1, ey, 2, 2, 'B')
        elif eyes == 'wide':
            f.rect(ex, ey - 1, 2, 3, 'B')
        elif eyes == 'happy':
            f.put(ex - 1, ey + 1, 'B')
            f.put(ex, ey, 'B')
            f.put(ex + 1, ey, 'B')
            f.put(ex + 2, ey + 1, 'B')
        elif eyes == 'x':
            for (px, py) in ((0, 0), (2, 0), (1, 1), (0, 2), (2, 2)):
                f.put(ex - 1 + px + (1 if ex > c + 6 else 0), ey - 1 + py, 'B')
    leg_top = r + 12
    if legs == 'stand':
        for lx in (c, c + 4, c + 10, c + 14):
            f.rect(lx, leg_top, 2, 4)
    elif legs == 'tuck':
        for lx in (c, c + 4, c + 10, c + 14):
            f.rect(lx, leg_top, 2, 2)
    elif legs == 'dangle':
        for i, lx in enumerate((c - 1, c + 4, c + 10, c + 15)):
            f.rect(lx, leg_top, 2, 5 if i in (1, 2) else 4)
    elif legs == 'stepA':
        for i, lx in enumerate((c, c + 4, c + 10, c + 14)):
            f.rect(lx, leg_top + (1 if i % 2 else 0), 2, 4 - (1 if i % 2 else 0))
    elif legs == 'stepB':
        for i, lx in enumerate((c, c + 4, c + 10, c + 14)):
            f.rect(lx, leg_top + (0 if i % 2 else 1), 2, 4 - (0 if i % 2 else 1))


def headphones(f, dx=0, dy=0):
    c, r = C0 + dx, R0 + dy
    for x in range(c + 1, c + 15):
        f.mark(x, r - 2)
    f.mark(c, r - 1)
    f.mark(c + 15, r - 1)
    f.glyph(c - 1, r, ['##', '##', '##', '##'])
    f.glyph(c + 15, r, ['##', '##', '##', '##'])


def hard_hat(f, x0, top, width):
    """A builder's hat over a head `width` cells wide starting at column x0."""
    for x in range(x0 + 2, x0 + width - 2):
        f.mark(x, top)
    for x in range(x0 + 1, x0 + width - 1):
        f.mark(x, top + 1)
    for x in range(x0 - 1, x0 + width + 1):
        f.mark(x, top + 2)


# ── Claude Code's laptop routine, laid onto the grid ────────────────────────
LEGACY_FW = 34
LEGACY_DX, LEGACY_DY = C0 - 14, R0 - 7


def legacy(index):
    body = Image.open(LEGACY_BODY).convert('RGBA')
    ink = Image.open(LEGACY_INK).convert('RGBA')
    f = Frame()
    lookup = {v: k for k, v in COLOURS.items()}
    for y in range(body.height):
        for x in range(LEGACY_FW):
            px = body.getpixel((index * LEGACY_FW + x, y))
            if px[3] > 0:
                f.put(x + LEGACY_DX, y + LEGACY_DY, lookup[px])
            elif ink.getpixel((index * LEGACY_FW + x, y))[3] > 0:
                f.mark(x + LEGACY_DX, y + LEGACY_DY)
    return f


ROUTINE = [
    0, 0, 0, 0, 1, 2, 1, 2, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 10, 11, 12, 10, 11, 12,
    10, 11, 12, 10, 11, 12, 10, 13, 14, 15, 16, 17, 17, 18, 19, 0, 0,
]


def new(**pose):
    f = Frame()
    crab(f, **pose)
    return f


# ── The animations ──────────────────────────────────────────────────────────
def idle():
    frames = [new() for _ in range(20)]
    frames += [new(eyes='shut'), new(eyes='shut'), new(), new()]
    return frames, 0


def idle_look():
    seq = ['open'] * 4 + ['left'] * 10 + ['open'] * 3 + ['right'] * 10 + ['open'] * 4
    return [new(eyes=e) for e in seq], 0


def idle_wave():
    seq = ['rest', 'mid', 'up', 'high', 'up', 'high', 'up', 'high', 'up', 'mid', 'rest', 'rest']
    return [new(right=p) for p in seq], 0


def idle_laptop():
    return [legacy(i) for i in ROUTINE], 0


def thinking():
    """Eyes up toward a thought bubble that rises dot by dot over the left
    claw, then holds, its three inner dots filling one by one."""
    frames = []
    bx, by = C0 - 14, R0 - 16
    for step in range(32):
        f = new(eyes='upleft')
        if step >= 2:
            f.glyph(C0 - 2, R0 - 3, GLYPHS['small'])
        if step >= 5:
            f.glyph(C0 - 6, R0 - 7, GLYPHS['dot'])
        if step >= 8:
            f.glyph(bx, by, GLYPHS['bubble'])
            filled = (step - 8) // 4 % 4
            for i in range(filled):
                f.glyph(bx + 3 + i * 2, by + 2, GLYPHS['small'])
        frames.append(f)
    return frames, 18


def typing():
    return [legacy(i) for i in (10, 11, 12, 10, 11, 12)], 0


def building():
    frames = []
    for i in (10, 11, 12, 11, 10, 12):
        f = legacy(i)
        hard_hat(f, 12 + LEGACY_DX, 6 + LEGACY_DY, 16)
        frames.append(f)
    return frames, 0


def music():
    frames = []
    notes = [(C0 - 6, R0 - 9), (C0 + 20, R0 - 12)]
    for step in range(16):
        bob = 1 if (step // 2) % 2 else 0
        f = new(dy=bob, eyes='shut' if step % 8 < 4 else 'happy', left='mid' if step % 4 < 2 else 'rest',
                right='rest' if step % 4 < 2 else 'mid')
        headphones(f, dy=bob)
        for i, (x, y) in enumerate(notes):
            rise = (step + i * 8) % 16 // 2
            f.glyph(x, y - rise, GLYPHS['note'])
        frames.append(f)
    return frames, 0


def conducting():
    frames = []
    seq = [('up', 'mid'), ('high', 'rest'), ('up', 'mid'), ('mid', 'up'), ('rest', 'high'), ('mid', 'up')]
    for step in range(24):
        left, right = seq[step // 4 % len(seq)]
        f = new(eyes='happy' if step % 12 < 6 else 'open', left=left, right=right)
        baton_x = C0 + 20 if right in ('high', 'up') else C0 + 21
        baton_y = R0 - 8 if right == 'high' else R0 - 5 if right == 'up' else R0 + 1
        f.glyph(baton_x, baton_y, ['#.', '.#', '.#'] if right != 'rest' else ['##'])
        frames.append(f)
    return frames, 0


def error():
    frames = []
    for step in range(24):
        shake = [0, -1, 0, 1][step % 4] if step < 16 else 0
        f = new(dx=shake, eyes='x', left='down', right='down')
        if step % 8 < 6:
            f.glyph(C0 + 7 + shake, R0 - 9, GLYPHS['!'])
        frames.append(f)
    return frames, 4


def happy():
    frames = []
    hops = [0, -2, -4, -5, -4, -2, 0, 0, 0, -2, -4, -5, -4, -2, 0, 0]
    for step, lift in enumerate(hops * 2):
        up = lift < 0
        f = new(dy=lift, eyes='happy', left='high' if up else 'up', right='high' if up else 'up',
                legs='dangle' if lift <= -4 else 'stand')
        if step % 4 < 2:
            f.glyph(C0 - 8, R0 - 6 + lift // 2, GLYPHS['spark'])
            f.glyph(C0 + 21, R0 - 10 + lift // 2, GLYPHS['spark'])
        else:
            f.glyph(C0 - 10, R0 - 11 + lift // 2, GLYPHS['spark'])
            f.glyph(C0 + 22, R0 - 4 + lift // 2, GLYPHS['spark'])
        frames.append(f)
    return frames, 3


def notification():
    frames = []
    for step in range(16):
        bounce = [0, -1, -2, -1][step // 2 % 4]
        f = new(eyes='wide', right='up' if step % 8 < 4 else 'mid')
        f.glyph(C0 + 7, R0 - 10 + bounce, GLYPHS['!'])
        frames.append(f)
    return frames, 0


def compacting():
    frames = []
    seq = [0, 1, 2, 3, 3, 2, 1, 0, 0, 0]
    for step in range(20):
        s = seq[step % len(seq)]
        f = new(squish=s, eyes='shut' if s >= 2 else 'open', left='rest', right='rest')
        if s == 3:
            f.glyph(C0 - 7, R0 + 13, GLYPHS['small'])
            f.glyph(C0 + 22, R0 + 12, GLYPHS['small'])
            f.glyph(C0 - 5, R0 + 9, GLYPHS['small'])
            f.glyph(C0 + 21, R0 + 8, GLYPHS['small'])
        frames.append(f)
    return frames, 3


def sleeping():
    frames = []
    letters = [('z', C0 + 18, R0 - 2), ('z', C0 + 22, R0 - 8), ('Z', C0 + 26 - 8, R0 - 15)]
    for step in range(32):
        breathe = 1 if step % 16 >= 8 else 0
        f = new(dy=2, eyes='shut', legs='tuck', left='down', right='down', squish=breathe)
        for i, (g, x, y) in enumerate(letters):
            phase = (step - i * 8) % 32
            if 0 <= phase < 24:
                f.glyph(x - 2, y - phase // 8, GLYPHS[g])
        frames.append(f)
    return frames, 0


def waking():
    frames = []
    lifts = [2, 2, 0, -3, -5, -6, -5, -3, 0, 0, 0, 0]
    for step, lift in enumerate(lifts):
        f = new(dy=lift, eyes='shut' if step < 2 else 'wide', left='high' if lift < 0 else 'rest',
                right='high' if lift < 0 else 'rest', legs='tuck' if step < 2 else 'dangle' if lift <= -5 else 'stand')
        if 2 <= step < 9:
            f.glyph(C0 + 7, R0 - 10 + lift, GLYPHS['!'])
        frames.append(f)
    return frames, 11


def poke(direction):
    frames = []
    push = [0, 2, 3, 3, 3, 2, 1, 0, 0, 0] if direction == 'left' else [0, -2, -3, -3, -3, -2, -1, 0, 0, 0]
    for step, dx in enumerate(push):
        eyes = 'shut' if 1 <= step <= 4 else 'open'
        f = new(dx=dx, eyes=eyes, left='mid' if dx > 0 else 'rest', right='mid' if dx < 0 else 'rest')
        frames.append(f)
    return frames, 0


def tickle():
    frames = []
    for step in range(16):
        dx = [0, -1, 0, 1][step % 4]
        f = new(dx=dx, eyes='happy', left='up' if step % 2 else 'mid', right='mid' if step % 2 else 'up',
                legs='stepA' if step % 2 else 'stepB')
        frames.append(f)
    return frames, 0


def drag():
    frames = []
    for step in range(8):
        sway = [0, 1, 0, -1][step // 2 % 4]
        f = new(dx=sway, dy=-3, eyes='wide', left='high', right='high', legs='dangle')
        frames.append(f)
    return frames, 0


ANIMATIONS = {
    'idle': idle,
    'idle-look': idle_look,
    'idle-wave': idle_wave,
    'idle-laptop': idle_laptop,
    'thinking': thinking,
    'typing': typing,
    'music': music,
    'conducting': conducting,
    'building': building,
    'error': error,
    'happy': happy,
    'notification': notification,
    'compacting': compacting,
    'sleeping': sleeping,
    'waking': waking,
    'poke-left': lambda: poke('left'),
    'poke-right': lambda: poke('right'),
    'tickle': tickle,
    'drag': drag,
}


def write(key, frames, still):
    cells = set()
    for f in frames:
        cells.update(f.body.keys())
        cells.update(f.ink)
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    box = [min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1]
    rows = (len(frames) + 7) // 8
    body = Image.new('RGBA', (box[2] * 8, box[3] * rows), (0, 0, 0, 0))
    ink = Image.new('RGBA', (box[2] * 8, box[3] * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        ox = (i % 8) * box[2] - box[0]
        oy = (i // 8) * box[3] - box[1]
        for (x, y), colour in f.body.items():
            body.putpixel((x + ox, y + oy), COLOURS[colour])
        for (x, y) in f.ink:
            ink.putpixel((x + ox, y + oy), (0, 0, 0, 255))
    body.save(os.path.join(OUT, f'{key}.png'), optimize=True)
    ink.save(os.path.join(OUT, f'{key}-ink.png'), optimize=True)
    return box


def main():
    os.makedirs(OUT, exist_ok=True)
    print('    const CRAB_SHEETS = {')
    for key, draw in ANIMATIONS.items():
        frames, still = draw()
        box = write(key, frames, still)
        print(f"      '{key}': {{ frames: {len(frames)}, box: [{box[0]}, {box[1]}, {box[2]}, {box[3]}], still: {still} }},")
    print('    }')


if __name__ == '__main__':
    main()
