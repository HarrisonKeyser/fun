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
./solver benchmark 4 4 4 2                                # time two sweeps of a large layer
```

On a Mac, install `gcc` with Homebrew (Apple's built-in clang lacks OpenMP), then use `g++-14` (or whichever version Homebrew installs) in place of `g++`.

## Results so far (2-core cloud machine)

| Pawns per side | Positions | Time | First player wins (perfect play) | Perfect vs. random |
| -------------- | --------- | ---- | -------------------------------- | ------------------ |
| 1 | 870 | instant | 53.00% | 49.8% (no real choices) |
| 2 | 189,660 | 1 s | 52.54% | 67.1% |
| 3 | 15,134,410 | 3.4 min | 52.73% | 76.1% |
| 5 (real game) | 12,511,485,660 | not yet run | — | — |
