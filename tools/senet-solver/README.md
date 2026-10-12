# Senet solver (Grandmaster research)

Computes perfect play for the Senet rules used on the site: for every position, the probability that the player about to roll wins if both sides play perfectly.

This is an offline tool. It isn't part of the website build.

## Files

- `solver.cpp` — the solver (C++, uses every CPU core via OpenMP)
- `cross-check.mjs` — confirms the solver's rules match `src/pages/SenetPage/senetRules.js` exactly

Run the solver with no arguments to see every command.

## Running it on Windows (MSYS2 UCRT64)

### One-time setup

1. Open **MSYS2 UCRT64** from the Start menu.
2. `pacman -Syu` (repeat until it says there's nothing to do), then `pacman -S --needed mingw-w64-ucrt-x86_64-gcc git`
3. `cd ~ && git clone --branch grandmaster-solver https://github.com/HarrisonKeyser/fun.git`

### Every time you use it

```bash
cd ~/fun && git pull                      # get the latest version
cd tools/senet-solver
g++ -O3 -march=native -fopenmp -o solver.exe solver.cpp
```

### Rehearsal: the 4-pawn game (about 15–30 minutes)

```bash
mkdir -p /c/senet
./solver.exe solve 4 --data /c/senet/four | tee -a /c/senet/four-log.txt
./solver.exe verify 4 --data /c/senet/four
./solver.exe simulate 4 --data /c/senet/four
./solver.exe certify 4 --data /c/senet/four        # slow (an hour or more); shows progress on big layers
```

`/c/senet/four` is the folder `C:\senet\four` in Windows. `tee -a` also saves everything printed to a log file.

### The full game

Before starting:

- **Free disk space:** at least 30 GB (17 GB of results, plus a 10 GB checkpoint while the biggest layer runs).
- **Memory:** the run peaks at about 12.6 GB. Close browsers and other large programs.
- **Keep the PC awake:** Settings → System → Power → set "When plugged in, put my device to sleep after" to **Never**.
- **Pause Windows Update** for a week (Settings → Windows Update → Pause updates), so it doesn't restart mid-run.

Start it:

```bash
./solver.exe solve 5 --data /c/senet/five | tee -a /c/senet/five-log.txt
```

**If it stops for any reason** (restart, power cut, closed window), run the exact same command again. Finished layers are skipped, and the big layers resume from their last checkpoint (saved every 20 minutes).

When it finishes:

```bash
./solver.exe verify 5 --data /c/senet/five
./solver.exe simulate 5 --data /c/senet/five
```

### Precision

By default values are stored in 16 bits (1/65535 steps). On the 3-pawn game this picked the exact best move in 99.92% of decisions; the rest were near-ties costing at most 0.003 percentage points of winning chance.

With 32 GB of RAM, add `--precise` to every command to store 32-bit values instead (about 7 significant digits; files and memory double: ~34 GB of results, ~25 GB peak RAM).

## How we know the answers are right

1. **Same rules as the website.** `cross-check.mjs` compares the solver's legal moves with the website's on random positions: 0 mismatches.
2. **Every position checks out.** `verify` recomputes every stored position from the positions it can lead to and reports the largest disagreement.
3. **There's only one possible answer.** `certify` solves a second way, starting every position with a lower bound of 0% and an upper bound of 100%, then tightening both. Any valid solution must lie between them, so when they meet, the answer is unique and proven. With `--data`, it also measures how far a saved solution is from the proven values. (It needs two 32-bit tables in memory, so it's for the 4-pawn game and smaller.)
4. **The numbers match reality.** `simulate` plays perfect vs. perfect and checks the first mover's win rate against the prediction; it also plays the website's Medium AI and a random player.

## Results so far

| Pawns per side | Positions | First mover wins (perfect play) | Perfect vs. Medium | Perfect vs. random |
| -------------- | --------- | ------------------------------- | ------------------ | ------------------ |
| 1 | 812 | 53.00% | — | 49.8% (no real choices) |
| 2 | 165,242 | 52.54% (certified 52.5423–52.5429%) | — | 67.1% |
| 3 | 12,230,750 | 52.73% (certified 52.7251–52.7257%; self-play 52.72% over 200,000 games) | 65.7% | 75.6% |
| 4 | 437,373,650 | 52.44% (self-play 52.58% over 100,000 games; verified, largest error 2.3e-5) | 68.8% | 80.4% |
| 5 (real game) | 8,560,690,670 | **52.2515%** (16-bit; solved in 7.3 hours on a Ryzen 5 7500X3D, 12 threads) | | |

Positions never include a pawn on house 27, since the House of Water always sends it straight back.
