"""Flood-fill near-black background from the canvas edges to alpha 0.

Does not punch holes in black car parts (tires, guns, grille) unless they
are 4-connected to the border through near-black pixels.
"""
from __future__ import annotations

import sys
from collections import deque

from PIL import Image

THRESHOLD = 8


def flood_black_to_alpha(im: Image.Image, threshold: int = THRESHOLD) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    assert px is not None

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r <= threshold and g <= threshold and b <= threshold

    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        if not is_bg(x, y):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))
    return im


def main(src: str, dst: str) -> None:
    im = Image.open(src)
    out = flood_black_to_alpha(im)
    out.save(dst)
    print(f"OK chroma {dst} size={out.size} mode={out.mode}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
