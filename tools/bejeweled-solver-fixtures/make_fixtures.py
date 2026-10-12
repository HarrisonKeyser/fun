"""
Writes answers from the Python Bejeweled bot's solver for the website's copy to be
tested against (src/pages/BejeweledPage/botSolver.test.js).

    pip install git+https://github.com/HarrisonKeyser/bejeweled-bot
    python tools/bejeweled-solver-fixtures/make_fixtures.py

Boards are 64 characters, row by row: R O Y G B P W for gems, lowercase for power
gems, H for a hypercube, ? for an unknown cell.
"""

import json
import random
from pathlib import Path

from bejeweled_bot.solver import find_best_move, legal_moves

CODES = {"R": "red", "O": "orange", "Y": "yellow", "G": "green", "B": "blue", "P": "purple", "W": "white"}
OUT = Path(__file__).parents[2] / "src/pages/BejeweledPage/botSolver.fixtures.json"


def decode(code):
    if code == "H":
        return "hypercube"
    if code == "?":
        return "unknown"
    if code.islower():
        return "power_" + CODES[code.upper()]
    return CODES[code]


def random_board(rng):
    colors = rng.sample(list(CODES), rng.randint(4, 7))
    cells = []
    for _ in range(64):
        roll = rng.random()
        if roll < 0.03:
            cells.append("H")
        elif roll < 0.06:
            cells.append("?")
        elif roll < 0.12:
            cells.append(rng.choice(colors).lower())
        else:
            cells.append(rng.choice(colors))
    return "".join(cells)


def main():
    rng = random.Random(2026)
    cases = []
    for _ in range(300):
        text = random_board(rng)
        board = [[(decode(text[r * 8 + c]), 0.9) for c in range(8)] for r in range(8)]
        best = find_best_move(board)
        cases.append({
            "board": text,
            "moves": len(legal_moves(board)),
            "best": list(best[:5]) if best else None,
        })
    OUT.write_text(json.dumps(cases, separators=(",", ":")) + "\n")
    print(f"Wrote {len(cases)} cases to {OUT}")


if __name__ == "__main__":
    main()
