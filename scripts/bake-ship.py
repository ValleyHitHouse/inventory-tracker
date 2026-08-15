#!/usr/bin/env python3
"""
Bake public/ship/deck.webp and public/ship/props/*.webp from the WinLu
Spaceship Tileset.

    pip install pillow
    python3 scripts/bake-ship.py /path/to/"Spaceship tileset" /path/to/"Spaceship textures- Other Engines"

The tileset itself is NOT in this repo — it is a paid asset. Only the baked
output is committed. Re-run this if you move a room.

IMPORTANT: ROOMS below must stay in sync with ROOMS in
app/dashboard/agents/ShipView.tsx. The component positions its glow and
labels from those tile coordinates; if they drift, the highlight lands
somewhere the floor isn't.
"""
import sys, json, pathlib
from PIL import Image, ImageFilter, ImageChops

if len(sys.argv) < 3:
    sys.exit(__doc__)
TILESET, OTHER = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'ship'
(OUT / 'props').mkdir(parents=True, exist_ok=True)

TS, COLS, ROWS = 48, 32, 20
CH = TILESET / 'Spaceship Tileset' / 'characters'

a2 = Image.open(OTHER / 'Godot_Spacestation_Inside_A2.png').convert('RGBA')
wl = Image.open(OTHER / 'Spaceship_walls.png').convert('RGBA')
tile = lambda im, x, y: im.crop((x * TS, y * TS, (x + 1) * TS, (y + 1) * TS))
FLOOR_ROOM, FLOOR_HALL, WALL = tile(a2, 2, 11), tile(a2, 2, 21), tile(wl, 1, 26)

# tile coords, already offset by the 1-tile margin
ROOMS = {
    'saguaro':    ((25, 7,  5, 6), 'Bridge'),
    'comp-watch': ((21, 4,  4, 4), 'Recon'),
    'flint':      ((15, 4,  5, 4), 'Break Ops'),
    'ember':      ((9,  4,  5, 4), 'Comms'),
    'frost':      ((21, 13, 4, 4), 'Treasury'),
    'slugger':    ((15, 13, 5, 4), 'Cargo Hold'),
    'fizz':       ((9,  13, 5, 4), 'Crew Quarters'),
    'thinker':    ((3,  7,  5, 6), 'Engineering'),
}
HALLS = [(8, 9, 18, 2), (11, 8, 2, 5), (17, 8, 2, 5), (22, 8, 2, 5)]

floor = {}
for (x, y, w, h), _ in ROOMS.values():
    for j in range(h):
        for i in range(w): floor[(x + i, y + j)] = 'room'
for x, y, w, h in HALLS:
    for j in range(h):
        for i in range(w): floor.setdefault((x + i, y + j), 'hall')

deck = Image.new('RGBA', (COLS * TS, ROWS * TS), (0, 0, 0, 0))
for (x, y), kind in floor.items():
    deck.alpha_composite(FLOOR_ROOM if kind == 'room' else FLOOR_HALL, (x * TS, y * TS))
# hull = any empty cell touching a floor cell
for y in range(ROWS):
    for x in range(COLS):
        if (x, y) in floor: continue
        if any((x + dx, y + dy) in floor for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
            deck.alpha_composite(WALL, (x * TS, y * TS))

# cyan rim so the silhouette reads against a near-black page
mask = deck.split()[3].point(lambda v: 255 if v > 8 else 0)
rim = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(5)), mask)
edge = Image.new('RGBA', deck.size, (70, 216, 224, 0))
edge.putalpha(rim.point(lambda v: int(v * 0.6)))
out = Image.new('RGBA', deck.size, (0, 0, 0, 0))
out.alpha_composite(edge); out.alpha_composite(deck)
out.save(OUT / 'deck.webp', 'WEBP', lossless=True, quality=100)

# props: row 0 of each RPG Maker !$ sheet (3 frames) laid out side by side
PROPS = {
    'console_a': '!$Consoles_main.png', 'console_b': '!$Consoles_main3.png',
    'console_c': '!$Consoles_diagonal.png', 'navigator': '!$Spaceship_Navigator.png',
    'reactor': '!$Spaceship_reactor.png', 'reactor_critical': '!$Spaceship_reactor_critical.png',
    'reactor_offline': '!$Spaceship_reactor_offline.png', 'medbay': '!$Spaceship_Medbay.png',
    'glow': '!$Spaceship_Glowing_Light.png',
}
sizes = {}
for name, fn in PROPS.items():
    im = Image.open(CH / fn).convert('RGBA')
    fw, fh = im.width // 3, im.height // 4
    strip = Image.new('RGBA', (fw * 3, fh), (0, 0, 0, 0))
    for c in range(3):
        strip.alpha_composite(im.crop((c * fw, 0, (c + 1) * fw, fh)), (c * fw, 0))
    strip.save(OUT / 'props' / f'{name}.webp', 'WEBP', lossless=True, quality=100)
    sizes[name] = {'w': fw, 'h': fh}

print(f'deck {out.size} -> {OUT/"deck.webp"}')
print(json.dumps(sizes, indent=2))
print('\nPROP_SIZE in ShipView.tsx must match the sizes above.')
