"""Draw the composer crab's animation sheets (packages/assets/src/mascot/crab/).

Run by hand after changing a drawing; the build never runs it:

    python scripts/draw-crab.py                                  # every sheet
    python scripts/draw-crab.py thinking happy                   # only the named animations
    python scripts/draw-crab.py thinking --preview .debug/crab   # and an enlarged GIF of each to look at

Needs Pillow. The crab is drawn on a 52x36 grid of cells, one pixel a cell,
feet on the bottom row and the right claw four columns in from the right
edge (the room a lean, a note or a sparkle takes on that side) — the stance
of Claude Code's own crab, whose laptop routine (packages/assets/src/mascot/crab/
crab-laptop-body.png and crab-laptop-ink.png, 34x23 cells a frame: the crab
pulls out a laptop, types, and puts it away) is laid onto the same grid for the
typing animations. Every animation is written as two sheets: `<key>.png`
carries the shell, its shaded side and the eyes in their colours;
`<key>-ink.png` is a mask the stylesheet fills with the theme's quiet ink
(the laptop, the bubble wand and its bubbles, letters, notes, the hat). A
sheet holds eight frames to a row, each cropped to the smallest box that
holds every frame of that animation. The script prints the rows of the
CRAB_SHEETS table in packages/client/src/features/mascot/sheets.ts for the
animations it drew; a changed frame count or box is copied there by hand.
"""
import argparse
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'packages', 'assets', 'src', 'mascot', 'crab')
LEGACY_BODY = os.path.join(OUT, 'crab-laptop-body.png')
LEGACY_INK = os.path.join(OUT, 'crab-laptop-ink.png')

W, H = 52, 36
COLOURS = {'A': (0xd9, 0x77, 0x57, 255), 'B': (0x14, 0x14, 0x13, 255), 'C': (0xb9, 0x60, 0x3f, 255)}
# The preview's stand-ins for the page: CRAB_FRAME_MS, the light canvas, the
# tertiary label ink the stylesheet fills the ink mask with, and the
# enlargement.
FRAME_MS = 80
PREVIEW_CANVAS = (0xfa, 0xf9, 0xf5, 255)
PREVIEW_INK = (0x91, 0x88, 0x8a, 255)
PREVIEW_SCALE = 8

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
    'wand': ['####', '#..#', '#..#', '####'],
    'bubble3': ['.#.', '#.#', '.#.'],
    'bubble4': ['.##.', '#..#', '#..#', '.##.'],
    'bubble5': ['.###.', '#...#', '#...#', '#...#', '.###.'],
    'bubble7': ['..###..', '.#...#.', '#.#...#', '#.....#', '#.....#', '.#...#.', '..###..'],
    'bubble7-wide': ['..####..', '.#....#.', '#.#....#', '#......#', '.#....#.', '..####..'],
    'bubble7-tall': ['..##..', '.#..#.', '#.#..#', '#....#', '#....#', '#....#', '.#..#.', '..##..'],
    'pop': ['....#....', '.#.....#.', '.........', '.........', '#.......#', '.........', '.........', '.#.....#.', '....#....'],
    'pop-wide': ['.....#.....', '...........', '#.........#', '...........', '.....#.....'],
}


def glyph_at(f, name, cx, cy):
    """Draw glyph `name` centred on cell (cx, cy), the odd cell rounding up-left."""
    rows = GLYPHS[name]
    f.glyph(cx - (len(rows[0]) - 1) // 2, cy - (len(rows) - 1) // 2, rows)


def crab(f, dx=0, dy=0, eyes='open', left='rest', right='rest', legs='stand', squish=0, puff=0, shade=False):
    """The front-facing crab, moved by (dx, dy). `squish` presses the shell
    down by that many rows and widens it by as many columns on each side;
    `puff` fills it with a breath, raising its top by that many rows and
    widening it the same way."""
    c, r = C0 + dx, R0 + dy
    top = r + squish - puff
    spread = squish + puff
    f.rect(c - spread, top, 16 + 2 * spread, 12 - squish + puff)
    if shade:
        f.rect(c + 14 + spread, top, 2, 12 - squish + puff, 'C')
    arm_row = r + 4 + squish // 2
    for side, pose in (('left', left), ('right', right)):
        x = c - 4 - spread if side == 'left' else c + 16 + spread
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
        elif eyes == 'upright':
            f.rect(ex + 1, ey - 1, 2, 2, 'B')
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


def bubble_wand(f, dx=0, dy=0, spread=0):
    """The wand the raised right claw ('up') holds: a stick from the claw's
    top and a square loop above it, apart from the round bubbles. It follows
    the crab moved by (dx, dy) and the claw pushed out by `spread` (a squish
    or a puff). Returns the loop's top row and centre column."""
    c, r = C0 + dx + spread, R0 + dy
    f.glyph(c + 17, r - 4, ['#', '#'])
    f.glyph(c + 16, r - 8, GLYPHS['wand'])
    return r - 8, c + 17


def thinking():
    """Blowing bubbles, a round of 48 frames that ends where it starts: the
    crab holds a bubble wand up in its right claw and looks at it, breathes
    in until its shell swells, blows the breath out into a bubble that grows
    out of the loop with a small one trailing, leans after the big one as it
    wobbles up and drifts over its head, hops twice for joy with its free
    claw up, flinches when it pops and hops once more."""
    frames = []
    eyes = (['upright'] * 4 + ['shut'] * 12 + ['up'] * 6 + ['happy'] * 8 + ['upleft'] * 6
            + ['wide'] * 2 + ['happy'] * 6 + ['upright'] * 4)
    # The breath: in over frames 4–7, out into the bubble over 8–13, and the
    # last push (a squish) at 14; the flinch at the pop is a squish too.
    puff = {4: 1, 5: 1, 6: 2, 7: 2, 8: 2, 9: 1, 10: 1, 11: 1}
    squish = {14: 1, 36: 1}
    # Leaning after the bubble from frame 19 until the round's last hop is done.
    lean = {step: -1 for step in range(19, 44)}
    hops = dict(zip(range(22, 30), [0, -1, -2, -1, 0, -1, -2, -1]))
    hops.update(zip(range(38, 44), [0, -1, -2, -1, 0, 0]))
    # The big bubble swells over the loop (frames 8–15), floats from there up
    # and left over the head (16–35) wobbling round, wide, round, tall, and
    # pops (36–38).
    swell = {8: 'bubble3', 9: 'bubble3', 10: 'bubble5', 11: 'bubble5', 12: 'bubble7', 13: 'bubble7', 14: 'bubble7', 15: 'bubble7'}
    wobble = ['bubble7', 'bubble7', 'bubble7-wide', 'bubble7-wide', 'bubble7', 'bubble7', 'bubble7-tall', 'bubble7-tall']
    float_path = [(44, 7), (43, 7), (42, 6), (42, 6), (41, 6), (40, 5), (39, 5), (39, 5), (38, 5), (37, 4),
                  (36, 4), (36, 4), (35, 4), (34, 4), (33, 3), (33, 3), (32, 4), (31, 4), (30, 4), (30, 4)]
    # The small bubble leaves the loop at frame 17, rises up the right edge
    # and pops at 28.
    small_path = [(49, 9), (49, 8), (48, 7), (48, 6), (48, 5), (49, 4), (49, 3), (49, 2), (48, 2), (48, 1), (48, 1)]
    for step, e in enumerate(eyes):
        dx, dy = lean.get(step, 0), hops.get(step, 0)
        p, s = puff.get(step, 0), squish.get(step, 0)
        if step in hops:
            left = 'up' if dy < 0 else 'mid'
        elif step == 37:
            left = 'up'
        else:
            left = 'rest'
        f = new(dx=dx, dy=dy, eyes=e, left=left, right='up', legs='dangle' if dy <= -2 else 'stand', puff=p, squish=s)
        loop_top, loop_x = bubble_wand(f, dx, dy, p + s)
        if step in swell:
            # Sitting on the loop, and one row clear of it as it lets go.
            name = swell[step]
            lift = 1 if step == 15 else 0
            glyph_at(f, name, loop_x, loop_top - 1 - len(GLYPHS[name]) // 2 - lift)
        elif 16 <= step < 36:
            cx, cy = float_path[step - 16]
            glyph_at(f, wobble[(step - 16) % len(wobble)], cx, cy)
        elif step == 36:
            glyph_at(f, 'pop', 30, 4)
        elif step == 37:
            glyph_at(f, 'pop-wide', 30, 4)
        elif step == 38:
            f.glyph(25, 4, GLYPHS['small'])
            f.glyph(35, 4, GLYPHS['small'])
        if 17 <= step < 28:
            cx, cy = small_path[step - 17]
            glyph_at(f, 'bubble4', cx, cy)
        elif step == 28:
            glyph_at(f, 'spark', 48, 1)
        frames.append(f)
    return frames, 24


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


def crop_box(frames):
    """The smallest box `[x, y, width, height]` that holds every frame."""
    cells = set()
    for f in frames:
        cells.update(f.body.keys())
        cells.update(f.ink)
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    return [min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1]


def write(key, frames):
    box = crop_box(frames)
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


def preview(key, frames, directory):
    """An enlarged GIF of the whole grid at the page's pace, the ink in the
    light theme's grey, and every frame laid out eight to a row in
    `<key>-frames.png`, for looking at a drawing without a build."""
    shots = []
    for f in frames:
        shot = Image.new('RGBA', (W, H), PREVIEW_CANVAS)
        for (x, y), colour in f.body.items():
            shot.putpixel((x, y), COLOURS[colour])
        # The ink mask is drawn over the sheet (crab.css's ::after).
        for (x, y) in f.ink:
            shot.putpixel((x, y), PREVIEW_INK)
        shots.append(shot)
    big = [shot.resize((W * PREVIEW_SCALE, H * PREVIEW_SCALE), Image.NEAREST).convert('P') for shot in shots]
    big[0].save(os.path.join(directory, f'{key}.gif'), save_all=True, append_images=big[1:],
                duration=FRAME_MS, loop=0, disposal=2)
    # One cell of the ink between frames keeps them apart.
    scale = PREVIEW_SCALE // 2
    rows = (len(shots) + 7) // 8
    sheet = Image.new('RGBA', ((W + 1) * 8 * scale, (H + 1) * rows * scale), PREVIEW_INK)
    for i, shot in enumerate(shots):
        sheet.paste(shot.resize((W * scale, H * scale), Image.NEAREST), ((i % 8) * (W + 1) * scale, (i // 8) * (H + 1) * scale))
    sheet.save(os.path.join(directory, f'{key}-frames.png'))


def main():
    parser = argparse.ArgumentParser(description='Draw the composer crab\'s animation sheets.')
    parser.add_argument('keys', nargs='*', metavar='key', help='the animations to draw (default: all of them)')
    parser.add_argument('--preview', metavar='DIR', help='also write an enlarged GIF of each animation into DIR')
    args = parser.parse_args()
    unknown = [key for key in args.keys if key not in ANIMATIONS]
    if unknown:
        parser.error(f'no animation named {", ".join(unknown)}; the animations are {", ".join(ANIMATIONS)}')
    keys = args.keys or list(ANIMATIONS)
    os.makedirs(OUT, exist_ok=True)
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
    for key in keys:
        frames, still = ANIMATIONS[key]()
        box = write(key, frames)
        if args.preview:
            preview(key, frames, args.preview)
        print(f"  '{key}': {{ frames: {len(frames)}, box: [{box[0]}, {box[1]}, {box[2]}, {box[3]}], still: {still} }},")


if __name__ == '__main__':
    main()
