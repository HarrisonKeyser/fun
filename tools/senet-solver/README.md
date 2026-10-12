# Senet solver (Grandmaster research)

Computes perfect play for the Senet rules used on the site: for every position, the probability that the player about to roll wins if both sides play perfectly.

Not part of the website build. It's an offline tool.

## Files

- `solver.cpp` — the solver (C++, uses all CPU cores via OpenMP)
- `cross-check.mjs` — confirms the solver's rules match `src/pages/SenetPage/senetRules.js` exactly

## Build and run

```bash
g++ -O3 -march=native -fopenmp -o solver tools/senet-solver/solver.cpp
node tools/senet-solver/cross-check.mjs ./solver          # should print "0 mismatches"
./solver solve 3 1e-7 --simulate 20000                    # full solve of the 3-pawn game (~3 minutes)
./solver solve 3 1e-5 --certify                           # prove the 3-pawn answer is the only one
./solver benchmark 4 4 4 2                                # time two sweeps of a large layer
```

On a Mac, install `gcc` with Homebrew (Apple's built-in clang lacks OpenMP), then use `g++-14` (or whichever version Homebrew installs) in place of `g++`.

## How we know the answers are right

1. **Same rules as the website.** `cross-check.mjs` compares the solver's legal moves with the website's on 200,000 random positions: 0 mismatches.
2. **Every position checks out.** After solving, a verification pass recomputes every stored position from the positions it can lead to. The largest disagreement must be ~0 (it is under 1e-7).
3. **There's only one possible answer.** `--certify` solves a second way: it starts every position at a lower bound of 0% and an upper bound of 100%, then tightens both. Any valid solution has to sit between the bounds, so when they meet, the answer is unique and proven.
4. **The numbers match reality.** Simulated games of perfect vs. perfect play reproduce the predicted first-mover win rate.

## Results so far (2-core cloud machine)

| Pawns per side | Positions | Solve time | First mover wins (perfect play) | Perfect vs. Medium | Perfect vs. random |
| -------------- | --------- | ---------- | ------------------------------- | ------------------ | ------------------ |
| 1 | 812 | instant | 53.00% | — | 49.8% (no real choices) |
| 2 | 165,242 | 1 s | 52.54% (certified 52.5423–52.5429%) | — | 67.1% |
| 3 | 12,230,750 | 2.7 min | 52.73% (certified 52.7251–52.7257%; self-play 52.72% over 200,000 games) | 65.7% | 75.6% |
| 5 (real game) | 8,560,690,670 | not yet run | — | — | — |

Positions never include a pawn on house 27, since the House of Water always sends it straight back.
