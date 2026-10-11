// Exact solver for Senet (the rules used on harrisonkeyser.fun/senet).
//
// For every position, computes the probability that the player about to roll wins,
// assuming both players play perfectly from then on. "Perfect play" = Grandmaster.
//
// How it works
//   - A position is stored from the point of view of the player about to roll:
//     `me` and `op` are 30-bit masks (bit h-1 set = a pawn on house h).
//     The game is symmetric between colors, so this halves the work.
//   - Positions are grouped into layers by how many pawns each side still has on the board.
//     Borne-off pawns never return, so moves only go to the same layer pair or a later one.
//   - Within a layer pair, captures and the House of Water create loops, so values are found by
//     value iteration: start with a guess and repeatedly apply
//         V(s) = sum over rolls r of P(r) * max over legal moves m of [1 - V(position after m)]
//     until nothing changes. A position with no legal moves passes the turn.
//
// Build:  g++ -O3 -march=native -fopenmp -o solver solver.cpp
// Usage:  ./solver solve <pawnsPerSide> [tolerance] [--simulate <games>] [--save <file>]
//         ./solver check < positions.txt     (prints legal moves; used to cross-check the website's rules)

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <map>
#include <random>
#include <string>
#include <vector>
#ifdef __BMI2__
#include <immintrin.h>
#endif
#ifdef _OPENMP
#include <omp.h>
#endif

using u32 = uint32_t;
using u64 = uint64_t;

constexpr int HOUSES = 30;
constexpr u32 BOARD_MASK = (1u << HOUSES) - 1;
constexpr u32 FIRST_ROW_MASK = (1u << 10) - 1;

// Probability of each roll 1..5 with four two-sided sticks (0 light sides counts as 5).
constexpr double ROLL_PROBABILITY[6] = {0, 4 / 16.0, 6 / 16.0, 4 / 16.0, 1 / 16.0, 1 / 16.0};

enum MoveType { MOVE = 0, CAPTURE = 1, WATER = 2, BEAR_OFF = 3 };

struct Move {
  int from;
  int landsOn;  // 0 for bear-off
  MoveType type;
};

inline u32 bit(int house) { return 1u << (house - 1); }
inline bool has(u32 mask, int house) { return house >= 1 && house <= HOUSES && (mask & bit(house)); }

// ---------------------------------------------------------------- rules (mirror of senetRules.js)

int legalMoves(u32 me, u32 op, int roll, Move* out) {
  const u32 all = me | op;
  const bool firstRowEmpty = (all & FIRST_ROW_MASK) == 0;
  int count = 0;

  for (u32 remaining = me; remaining; remaining &= remaining - 1) {
    const int from = __builtin_ctz(remaining) + 1;

    const bool bearOff = (from == 26 && roll == 5) || (from == 28 && roll == 3) ||
                         (from == 29 && roll == 2) || (from == 30 && (roll == 1 || firstRowEmpty));
    if (bearOff) {
      out[count++] = {from, 0, BEAR_OFF};
      continue;
    }

    const int to = from + roll;
    if (to > HOUSES) continue;
    if (from != 26 && to > 26) continue;  // must stop exactly on the House of Happiness
    if (has(me, to)) continue;

    const bool occupied = has(op, to);
    if (occupied) {
      if (to == 15 || to == 26 || to == 28 || to == 29) continue;  // safe houses
      if (has(op, to - 1) || has(op, to + 1)) continue;            // protected pair
    }

    bool blocked = false;  // can't pass an opponent's blockade of three
    for (int house = from + 1; house < to && !blocked; house++) {
      blocked = has(op, house) && has(op, house - 1) && has(op, house + 1);
    }
    if (blocked) continue;

    if (to == 27) {  // House of Water: back to 15, or the nearest empty house before it
      int landsOn = 0;
      for (int house = 15; house >= 1; house--) {
        if (!has(all, house)) {
          landsOn = house;
          break;
        }
      }
      if (!landsOn) continue;
      out[count++] = {from, landsOn, WATER};
      continue;
    }

    out[count++] = {from, to, occupied ? CAPTURE : MOVE};
  }
  return count;
}

void applyMove(u32& me, u32& op, const Move& move) {
  me &= ~bit(move.from);
  if (move.type == BEAR_OFF) return;
  me |= bit(move.landsOn);
  if (move.type == CAPTURE) {
    op &= ~bit(move.landsOn);
    op |= bit(move.from);
  }
}

// ---------------------------------------------------------------- position <-> index

u64 BINOMIAL[HOUSES + 2][HOUSES + 2];

void initBinomials() {
  for (int n = 0; n <= HOUSES + 1; n++) {
    BINOMIAL[n][0] = 1;
    for (int k = 1; k <= n; k++) BINOMIAL[n][k] = BINOMIAL[n - 1][k - 1] + (k <= n - 1 ? BINOMIAL[n - 1][k] : 0);
  }
}

inline u32 extractBits(u32 value, u32 mask) {
#ifdef __BMI2__
  return _pext_u32(value, mask);
#else
  u32 result = 0;
  for (u32 out = 1; mask; mask &= mask - 1, out <<= 1)
    if (value & mask & -mask) result |= out;
  return result;
#endif
}

inline u32 depositBits(u32 value, u32 mask) {
#ifdef __BMI2__
  return _pdep_u32(value, mask);
#else
  u32 result = 0;
  for (u32 in = 1; mask; mask &= mask - 1, in <<= 1)
    if (value & in) result |= mask & -mask;
  return result;
#endif
}

// Rank of a bit set among all sets with the same number of bits (colexicographic order).
inline u64 combinationRank(u32 set) {
  u64 rank = 0;
  int k = 1;
  for (; set; set &= set - 1, k++) rank += BINOMIAL[__builtin_ctz(set)][k];
  return rank;
}

// Next larger integer with the same number of set bits (Gosper's hack) — walks sets in rank order.
inline u32 nextCombination(u32 set) {
  const u32 lowest = set & -set;
  const u32 ripple = set + lowest;
  return ripple | (((set ^ ripple) >> 2) / lowest);
}

struct Layer {
  int mine = 0, theirs = 0;
  u64 opponentPlacements = 0;  // C(30 - mine, theirs)
  std::vector<float> value;    // P(player about to roll wins)
};

struct Solver {
  int pawns;
  std::vector<Layer> layers;  // indexed [mine * (pawns+1) + theirs]

  explicit Solver(int pawnsPerSide) : pawns(pawnsPerSide), layers((pawnsPerSide + 1) * (pawnsPerSide + 1)) {
    for (int a = 0; a <= pawns; a++)
      for (int b = 0; b <= pawns; b++) {
        Layer& layer = layerFor(a, b);
        layer.mine = a;
        layer.theirs = b;
        layer.opponentPlacements = BINOMIAL[HOUSES - a][b];
      }
  }

  Layer& layerFor(int mine, int theirs) { return layers[mine * (pawns + 1) + theirs]; }

  u64 index(const Layer& layer, u32 me, u32 op) const {
    const u32 freeHouses = ~me & BOARD_MASK;
    return combinationRank(me) * layer.opponentPlacements + combinationRank(extractBits(op, freeHouses));
  }

  float valueOf(u32 me, u32 op) {
    Layer& layer = layerFor(__builtin_popcount(me), __builtin_popcount(op));
    return layer.value[index(layer, me, op)];
  }

  // Win probability for the player about to roll, given current estimates of the other positions.
  // If `bestMoves` is given, also records the best move index for each roll (-1 = pass).
  double evaluate(u32 me, u32 op, int* bestMoves = nullptr) {
    Move moves[8];
    double total = 0;
    for (int roll = 1; roll <= 5; roll++) {
      const int count = legalMoves(me, op, roll, moves);
      double best;
      int bestIndex = -1;
      if (count == 0) {
        best = 1.0 - valueOf(op, me);  // pass
      } else {
        best = -1;
        for (int i = 0; i < count; i++) {
          u32 nextMe = me, nextOp = op;
          applyMove(nextMe, nextOp, moves[i]);
          const double result = nextMe == 0 ? 1.0 : 1.0 - valueOf(nextOp, nextMe);
          if (result > best) {
            best = result;
            bestIndex = i;
          }
        }
      }
      if (bestMoves) bestMoves[roll] = bestIndex;
      total += ROLL_PROBABILITY[roll] * best;
    }
    return total;
  }

  // One in-place pass over a layer. Returns the largest change.
  double sweep(Layer& layer) {
    const int a = layer.mine, b = layer.theirs;
    std::vector<u32> myPlacements;
    for (u32 me = (1u << a) - 1; me <= BOARD_MASK; me = nextCombination(me)) {
      myPlacements.push_back(me);
      if (a == 0) break;
    }
    double largestChange = 0;
#pragma omp parallel for schedule(dynamic, 64) reduction(max : largestChange)
    for (size_t i = 0; i < myPlacements.size(); i++) {
      const u32 me = myPlacements[i];
      const u32 freeHouses = ~me & BOARD_MASK;
      const u64 base = i * layer.opponentPlacements;
      const u32 limit = (1u << (HOUSES - a)) - 1;
      u64 j = 0;
      for (u32 compact = (1u << b) - 1; compact <= limit; compact = nextCombination(compact), j++) {
        const u32 op = depositBits(compact, freeHouses);
        const float updated = (float)evaluate(me, op);
        float& stored = layer.value[base + j];
        largestChange = std::max(largestChange, (double)std::fabs(updated - stored));
        stored = updated;
      }
    }
    return largestChange;
  }

  void solve(double tolerance) {
    // Earlier-finishing layer pairs first: fewer pawns left on the board = closer to the end.
    for (int total = 2; total <= 2 * pawns; total++) {
      for (int a = std::max(1, total - pawns); a <= std::min(pawns, total - 1); a++) {
        const int b = total - a;
        if (a > b) continue;  // handle (a,b) and (b,a) together
        std::vector<Layer*> group = {&layerFor(a, b)};
        if (a != b) group.push_back(&layerFor(b, a));

        u64 states = 0;
        for (Layer* layer : group) {
          const u64 size = BINOMIAL[HOUSES][layer->mine] * layer->opponentPlacements;
          layer->value.assign(size, 0.5f);
          states += size;
        }

        const auto start = std::chrono::steady_clock::now();
        int sweeps = 0;
        double change;
        do {
          change = 0;
          for (Layer* layer : group) change = std::max(change, sweep(*layer));
          sweeps++;
        } while (change > tolerance && sweeps < 100000);
        const double seconds =
            std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();

        printf("  layers %d-%d%s: %13llu positions, %4d sweeps, %9.2f s, %6.1f ns/position/sweep\n", a, b,
               a != b ? " & reverse" : "          ", (unsigned long long)states, sweeps, seconds,
               1e9 * seconds / ((double)states * sweeps));
        fflush(stdout);
      }
    }
  }

  // Exact Bellman check: how far is each stored value from its own update? (should be ~tolerance)
  double largestResidual(int samplesPerLayer, std::mt19937_64& rng) {
    double worst = 0;
    for (Layer& layer : layers) {
      if (layer.value.empty()) continue;
      for (int s = 0; s < samplesPerLayer; s++) {
        u32 me, op;
        randomPosition(layer.mine, layer.theirs, rng, me, op);
        worst = std::max(worst, std::fabs(evaluate(me, op) - valueOf(me, op)));
      }
    }
    return worst;
  }

  static void randomPosition(int a, int b, std::mt19937_64& rng, u32& me, u32& op) {
    int houses[HOUSES];
    for (int i = 0; i < HOUSES; i++) houses[i] = i + 1;
    std::shuffle(houses, houses + HOUSES, rng);
    me = op = 0;
    for (int i = 0; i < a; i++) me |= bit(houses[i]);
    for (int i = a; i < a + b; i++) op |= bit(houses[i]);
  }
};

// ---------------------------------------------------------------- simulation

int rollSticks(std::mt19937_64& rng) {
  const int lights = __builtin_popcount(rng() & 0xF);
  return lights == 0 ? 5 : lights;
}

u32 startingPawns(int pawns, bool evenHouses) {
  u32 mask = 0;
  for (int i = 0; i < pawns; i++) mask |= bit(2 * i + (evenHouses ? 2 : 1));
  return mask;
}

// Plays games between the perfect player and a random player. Returns perfect player's win rate.
double simulate(Solver& solver, int games, std::mt19937_64& rng) {
  int wins = 0;
  Move moves[8];
  for (int g = 0; g < games; g++) {
    // The player on the even houses moves first. Perfect player alternates seats.
    u32 pawns[2] = {startingPawns(solver.pawns, true), startingPawns(solver.pawns, false)};
    int toMove = 0;
    const int perfectSeat = g % 2;
    while (true) {
      u32& me = pawns[toMove];
      u32& op = pawns[1 - toMove];
      const int roll = rollSticks(rng);
      const int count = legalMoves(me, op, roll, moves);
      if (count > 0) {
        int choice;
        if (toMove == perfectSeat) {
          int best[6];
          solver.evaluate(me, op, best);
          choice = best[roll];
        } else {
          choice = (int)(rng() % count);
        }
        applyMove(me, op, moves[choice]);
        if (me == 0) {
          wins += toMove == perfectSeat;
          break;
        }
      }
      toMove = 1 - toMove;
    }
  }
  return (double)wins / games;
}

// ---------------------------------------------------------------- main

int main(int argc, char** argv) {
  initBinomials();
  if (argc >= 2 && std::string(argv[1]) == "check") {
    // Input lines: "<me mask> <op mask> <roll>". Output: moves as from:type:landsOn, sorted.
    unsigned me, op;
    int roll;
    Move moves[8];
    while (scanf("%u %u %d", &me, &op, &roll) == 3) {
      const int count = legalMoves(me, op, roll, moves);
      std::vector<std::string> parts;
      for (int i = 0; i < count; i++)
        parts.push_back(std::to_string(moves[i].from) + ":" + std::to_string(moves[i].type) + ":" +
                        std::to_string(moves[i].landsOn));
      std::sort(parts.begin(), parts.end());
      std::string line;
      for (auto& part : parts) line += (line.empty() ? "" : " ") + part;
      printf("%s\n", line.c_str());
    }
    return 0;
  }

  if (argc >= 5 && std::string(argv[1]) == "benchmark") {
    // Time a few sweeps of one big layer (its neighbors are filled with placeholder values).
    // Usage: ./solver benchmark <pawnsPerSide> <mine> <theirs> [sweeps]
    const int pawns = atoi(argv[2]), a = atoi(argv[3]), b = atoi(argv[4]);
    const int sweeps = argc >= 6 ? atoi(argv[5]) : 2;
    Solver solver(pawns);
    for (auto [x, y] : {std::pair{a, b}, std::pair{b, a}, std::pair{b, a - 1}}) {
      if (x < 1 || y < 1) continue;
      Layer& layer = solver.layerFor(x, y);
      if (layer.value.empty()) layer.value.assign(BINOMIAL[HOUSES][x] * layer.opponentPlacements, 0.5f);
    }
    Layer& target = solver.layerFor(a, b);
    for (int s = 0; s < sweeps; s++) {
      const auto start = std::chrono::steady_clock::now();
      solver.sweep(target);
      const double seconds = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
      printf("layer %d-%d: %llu positions, sweep %.1f s, %.1f ns/position\n", a, b,
             (unsigned long long)target.value.size(), seconds, 1e9 * seconds / target.value.size());
      fflush(stdout);
    }
    return 0;
  }

  if (argc < 3 || std::string(argv[1]) != "solve") {
    fprintf(stderr, "usage: %s solve <pawnsPerSide> [tolerance] [--simulate N] [--save file]\n", argv[0]);
    return 1;
  }
  const int pawns = atoi(argv[2]);
  double tolerance = 1e-6;
  int games = 0;
  std::string saveTo;
  for (int i = 3; i < argc; i++) {
    std::string arg = argv[i];
    if (arg == "--simulate" && i + 1 < argc) games = atoi(argv[++i]);
    else if (arg == "--save" && i + 1 < argc) saveTo = argv[++i];
    else tolerance = atof(arg.c_str());
  }

#ifdef _OPENMP
  printf("Solving %d-pawn Senet with %d threads (tolerance %.0e)\n", pawns, omp_get_max_threads(), tolerance);
#endif
  Solver solver(pawns);
  const auto start = std::chrono::steady_clock::now();
  solver.solve(tolerance);
  printf("Total time: %.1f s\n",
         std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count());

  const u32 first = startingPawns(pawns, true), second = startingPawns(pawns, false);
  printf("Starting position: first player wins %.4f%% with perfect play by both sides\n",
         100 * solver.valueOf(first, second));

  std::mt19937_64 rng(12345);
  printf("Largest Bellman residual (random sample): %.2e\n", solver.largestResidual(2000, rng));
  if (games > 0) printf("Perfect vs. random player: perfect wins %.2f%% of %d games\n",
                        100 * simulate(solver, games, rng), games);

  if (!saveTo.empty()) {
    FILE* file = fopen(saveTo.c_str(), "wb");
    for (Layer& layer : solver.layers)
      if (!layer.value.empty()) fwrite(layer.value.data(), sizeof(float), layer.value.size(), file);
    fclose(file);
    printf("Saved values to %s\n", saveTo.c_str());
  }
  return 0;
}
