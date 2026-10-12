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

// A pawn can never stay on house 27 (the House of Water sends it straight back), so positions
// are stored over the other 29 houses ("slots"). This cuts every table by about a third.
constexpr int SLOTS = 29;
constexpr u32 SLOT_MASK = BOARD_MASK & ~(1u << 26);  // every house except 27
constexpr u32 ALL_SLOTS = (1u << SLOTS) - 1;

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
  u64 opponentPlacements = 0;  // C(29 - mine, theirs)
  std::vector<float> value;    // P(player about to roll wins). In certify mode: a guaranteed lower bound.
  std::vector<float> upper;    // certify mode only: a guaranteed upper bound
  u64 size() const { return BINOMIAL[SLOTS][mine] * opponentPlacements; }
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
        layer.opponentPlacements = BINOMIAL[SLOTS - a][b];
      }
  }

  Layer& layerFor(int mine, int theirs) { return layers[mine * (pawns + 1) + theirs]; }

  u64 index(const Layer& layer, u32 me, u32 op) const {
    const u32 mySlots = extractBits(me, SLOT_MASK);
    const u32 freeSlots = ~mySlots & ALL_SLOTS;
    return combinationRank(mySlots) * layer.opponentPlacements +
           combinationRank(extractBits(extractBits(op, SLOT_MASK), freeSlots));
  }

  template <bool readUpper = false>
  float valueOf(u32 me, u32 op) {
    Layer& layer = layerFor(__builtin_popcount(me), __builtin_popcount(op));
    return (readUpper ? layer.upper : layer.value)[index(layer, me, op)];
  }

  // Win probability for the player about to roll, given current estimates of the other positions.
  // If `bestMoves` is given, also records the best move index for each roll (-1 = pass).
  // readUpper: read the opponent's upper bounds (used to compute a guaranteed lower bound).
  template <bool readUpper = false>
  double evaluate(u32 me, u32 op, int* bestMoves = nullptr) {
    Move moves[8];
    double total = 0;
    for (int roll = 1; roll <= 5; roll++) {
      const int count = legalMoves(me, op, roll, moves);
      double best;
      int bestIndex = -1;
      if (count == 0) {
        best = 1.0 - valueOf<readUpper>(op, me);  // pass
      } else {
        best = -1;
        for (int i = 0; i < count; i++) {
          u32 nextMe = me, nextOp = op;
          applyMove(nextMe, nextOp, moves[i]);
          const double result = nextMe == 0 ? 1.0 : 1.0 - valueOf<readUpper>(nextOp, nextMe);
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

  // One in-place pass over a layer, visiting positions in storage order. Returns the largest change
  // (or, when certifying, the largest gap between the lower and upper bound).
  template <bool certify = false>
  double sweep(Layer& layer) {
    const int a = layer.mine, b = layer.theirs;
    std::vector<u32> mySlotSets;
    for (u32 set = (1u << a) - 1; set <= ALL_SLOTS; set = nextCombination(set)) mySlotSets.push_back(set);

    double largest = 0;
#pragma omp parallel for schedule(dynamic, 64) reduction(max : largest)
    for (size_t i = 0; i < mySlotSets.size(); i++) {
      const u32 me = depositBits(mySlotSets[i], SLOT_MASK);
      const u32 freeSlots = ~mySlotSets[i] & ALL_SLOTS;
      const u64 base = i * layer.opponentPlacements;
      const u32 limit = (1u << (SLOTS - a)) - 1;
      u64 j = 0;
      for (u32 compact = (1u << b) - 1; compact <= limit; compact = nextCombination(compact), j++) {
        const u32 op = depositBits(depositBits(compact, freeSlots), SLOT_MASK);
        if (certify) {
          // A lower bound comes from assuming the opponent does as well as their upper bound, and vice versa.
          float& low = layer.value[base + j];
          float& high = layer.upper[base + j];
          low = std::max(low, (float)evaluate<true>(me, op));
          high = std::min(high, (float)evaluate<false>(me, op));
          largest = std::max(largest, (double)(high - low));
        } else {
          const float updated = (float)evaluate(me, op);
          float& stored = layer.value[base + j];
          largest = std::max(largest, (double)std::fabs(updated - stored));
          stored = updated;
        }
      }
    }
    return largest;
  }

  template <bool certify = false>
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
          if (certify) {
            layer->value.assign(layer->size(), 0.0f);  // lower bounds start at 0% ...
            layer->upper.assign(layer->size(), 1.0f);  // ... and upper bounds at 100%
          } else {
            layer->value.assign(layer->size(), 0.5f);
          }
          states += layer->size();
        }

        const auto start = std::chrono::steady_clock::now();
        int sweeps = 0;
        double change;
        do {
          change = 0;
          for (Layer* layer : group) change = std::max(change, sweep<certify>(*layer));
          sweeps++;
          if (certify && sweeps % 25 == 0) {
            printf("    sweep %d: widest gap between bounds %.3e\n", sweeps, change);
            fflush(stdout);
          }
        } while (change > tolerance && sweeps < 2000);
        const double seconds =
            std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();

        printf("  layers %d-%d%s: %13llu positions, %4d sweeps, %9.2f s, %6.1f ns/position/sweep\n", a, b,
               a != b ? " & reverse" : "          ", (unsigned long long)states, sweeps, seconds,
               1e9 * seconds / ((double)states * sweeps));
        fflush(stdout);
      }
    }
  }

  // The verification pass: recompute every single stored position from its successors and report the
  // largest disagreement. For a correct solution this is ~0 (up to the convergence tolerance).
  double fullResidual() {
    double worst = 0;
    for (Layer& layer : layers) {
      if (layer.value.empty()) continue;
      const int a = layer.mine, b = layer.theirs;
      std::vector<u32> mySlotSets;
      for (u32 set = (1u << a) - 1; set <= ALL_SLOTS; set = nextCombination(set)) mySlotSets.push_back(set);
#pragma omp parallel for schedule(dynamic, 64) reduction(max : worst)
      for (size_t i = 0; i < mySlotSets.size(); i++) {
        const u32 me = depositBits(mySlotSets[i], SLOT_MASK);
        const u32 freeSlots = ~mySlotSets[i] & ALL_SLOTS;
        const u32 limit = (1u << (SLOTS - a)) - 1;
        u64 j = i * layer.opponentPlacements;
        for (u32 compact = (1u << b) - 1; compact <= limit; compact = nextCombination(compact), j++) {
          const u32 op = depositBits(depositBits(compact, freeSlots), SLOT_MASK);
          worst = std::max(worst, std::fabs(evaluate(me, op) - layer.value[j]));
        }
      }
    }
    return worst;
  }

  u64 positionCount() const {
    u64 total = 0;
    for (const Layer& layer : layers)
      if (layer.mine && layer.theirs) total += layer.size();
    return total;
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

enum Opponent { RANDOM, MEDIUM, PERFECT };

// The website's Medium computer: bear off > safe house > capture > ordinary move > House of Water.
int mediumPriority(const Move& move) {
  if (move.type == BEAR_OFF) return 0;
  if (move.type != WATER && (move.landsOn == 26 || move.landsOn == 28 || move.landsOn == 29)) return 1;
  if (move.type == CAPTURE) return 2;
  if (move.type == WATER) return 4;
  return 3;
}

int chooseMove(Solver& solver, Opponent who, u32 me, u32 op, int roll, const Move* moves, int count,
               std::mt19937_64& rng) {
  if (who == PERFECT) {
    int best[6];
    solver.evaluate(me, op, best);
    return best[roll];
  }
  if (who == MEDIUM) {
    int bestPriority = 99, ties = 0, choice = 0;
    for (int i = 0; i < count; i++) {
      const int p = mediumPriority(moves[i]);
      if (p < bestPriority) bestPriority = p, ties = 0;
      if (p == bestPriority && rng() % (++ties) == 0) choice = i;  // uniform among the best
    }
    return choice;
  }
  return (int)(rng() % count);
}

// Plays `games` games: the perfect player against `opponent`, alternating who moves first.
// Returns { perfect player's win rate, first mover's win rate }.
std::pair<double, double> simulate(Solver& solver, Opponent opponent, int games, std::mt19937_64& rng) {
  long perfectWins = 0, firstMoverWins = 0;
  Move moves[8];
  for (int g = 0; g < games; g++) {
    u32 pawns[2] = {startingPawns(solver.pawns, true), startingPawns(solver.pawns, false)};
    int toMove = 0;  // seat 0 starts on the even houses and moves first
    const int perfectSeat = g % 2;
    while (true) {
      u32& me = pawns[toMove];
      u32& op = pawns[1 - toMove];
      const int roll = rollSticks(rng);
      const int count = legalMoves(me, op, roll, moves);
      if (count > 0) {
        const Opponent who = toMove == perfectSeat ? PERFECT : opponent;
        applyMove(me, op, moves[chooseMove(solver, who, me, op, roll, moves, count, rng)]);
        if (me == 0) {
          perfectWins += toMove == perfectSeat;
          firstMoverWins += toMove == 0;
          break;
        }
      }
      toMove = 1 - toMove;
    }
  }
  return {(double)perfectWins / games, (double)firstMoverWins / games};
}

// ---------------------------------------------------------------- comparison with version 1 (30-house tables)

// Checks every position in this solution against a table saved by the first version of the solver,
// which also stored (impossible) positions with a pawn on house 27.
void compareWithVersion1(Solver& solver, const std::string& path) {
  FILE* file = fopen(path.c_str(), "rb");
  if (!file) {
    printf("Could not open %s\n", path.c_str());
    return;
  }
  const int n = solver.pawns;
  std::vector<std::vector<float>> old((n + 1) * (n + 1));
  for (int a = 0; a <= n; a++)
    for (int b = 0; b <= n; b++) {
      if (!a || !b) continue;
      old[a * (n + 1) + b].resize(BINOMIAL[HOUSES][a] * BINOMIAL[HOUSES - a][b]);
      if (fread(old[a * (n + 1) + b].data(), sizeof(float), old[a * (n + 1) + b].size(), file) !=
          old[a * (n + 1) + b].size()) {
        printf("Saved file is shorter than expected\n");
        fclose(file);
        return;
      }
    }
  fclose(file);

  double worst = 0;
  u64 compared = 0;
  for (Layer& layer : solver.layers) {
    if (layer.value.empty()) continue;
    const int a = layer.mine, b = layer.theirs;
    const std::vector<float>& oldLayer = old[a * (n + 1) + b];
    u64 j = 0;
    for (u32 mine = (1u << a) - 1; mine <= ALL_SLOTS; mine = nextCombination(mine)) {
      const u32 me = depositBits(mine, SLOT_MASK);
      const u32 freeSlots = ~mine & ALL_SLOTS;
      for (u32 compact = (1u << b) - 1; compact <= (1u << (SLOTS - a)) - 1; compact = nextCombination(compact), j++) {
        const u32 op = depositBits(depositBits(compact, freeSlots), SLOT_MASK);
        const u64 oldIndex = combinationRank(me) * BINOMIAL[HOUSES - a][b] +
                             combinationRank(extractBits(op, ~me & BOARD_MASK));
        worst = std::max(worst, (double)std::fabs(oldLayer[oldIndex] - layer.value[j]));
        compared++;
      }
    }
  }
  printf("Compared %llu positions with version 1: largest difference %.2e\n", (unsigned long long)compared, worst);
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
      if (layer.value.empty()) layer.value.assign(layer.size(), 0.5f);
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
    fprintf(stderr,
            "usage: %s solve <pawnsPerSide> [tolerance] [--certify] [--simulate N] [--save file] "
            "[--compare-v1 file]\n",
            argv[0]);
    return 1;
  }
  const int pawns = atoi(argv[2]);
  double tolerance = 1e-6;
  int games = 0;
  bool certify = false;
  std::string saveTo, compareTo;
  for (int i = 3; i < argc; i++) {
    std::string arg = argv[i];
    if (arg == "--simulate" && i + 1 < argc) games = atoi(argv[++i]);
    else if (arg == "--save" && i + 1 < argc) saveTo = argv[++i];
    else if (arg == "--compare-v1" && i + 1 < argc) compareTo = argv[++i];
    else if (arg == "--certify") certify = true;
    else tolerance = atof(arg.c_str());
  }

  Solver solver(pawns);
#ifdef _OPENMP
  printf("%s %d-pawn Senet (%llu positions) with %d threads, tolerance %.0e\n", certify ? "Certifying" : "Solving",
         pawns, (unsigned long long)solver.positionCount(), omp_get_max_threads(), tolerance);
#endif
  const auto start = std::chrono::steady_clock::now();
  if (certify) solver.solve<true>(tolerance);
  else solver.solve<false>(tolerance);
  printf("Total time: %.1f s\n",
         std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count());

  const u32 first = startingPawns(pawns, true), second = startingPawns(pawns, false);
  if (certify) {
    double widest = 0;
    for (Layer& layer : solver.layers)
      for (u64 i = 0; i < layer.value.size(); i++) widest = std::max(widest, (double)(layer.upper[i] - layer.value[i]));
    printf("Certified: every position's true value is pinned between bounds at most %.2e apart\n", widest);
    printf("Starting position: first player wins between %.5f%% and %.5f%%\n",
           100 * solver.valueOf<false>(first, second), 100 * solver.valueOf<true>(first, second));
    // From here on, use the midpoint of the bounds as the answer.
    for (Layer& layer : solver.layers)
      for (u64 i = 0; i < layer.value.size(); i++) layer.value[i] = 0.5f * (layer.value[i] + layer.upper[i]);
  } else {
    printf("Starting position: first player wins %.4f%% with perfect play by both sides\n",
           100 * solver.valueOf(first, second));
    printf("Verification pass over every position: largest error %.2e\n", solver.fullResidual());
  }

  if (!compareTo.empty()) compareWithVersion1(solver, compareTo);

  if (games > 0) {
    std::mt19937_64 rng(12345);
    auto [vsSelf, firstMover] = simulate(solver, PERFECT, games, rng);
    (void)vsSelf;
    printf("Perfect vs. perfect (%d games): first mover won %.2f%%  (predicted %.2f%%)\n", games, 100 * firstMover,
           100 * solver.valueOf(first, second));
    printf("Perfect vs. Medium  (%d games): perfect won %.2f%%\n", games, 100 * simulate(solver, MEDIUM, games, rng).first);
    printf("Perfect vs. random  (%d games): perfect won %.2f%%\n", games, 100 * simulate(solver, RANDOM, games, rng).first);
  }

  if (!saveTo.empty()) {
    FILE* file = fopen(saveTo.c_str(), "wb");
    for (Layer& layer : solver.layers)
      if (!layer.value.empty()) fwrite(layer.value.data(), sizeof(float), layer.value.size(), file);
    fclose(file);
    printf("Saved values to %s\n", saveTo.c_str());
  }
  return 0;
}
