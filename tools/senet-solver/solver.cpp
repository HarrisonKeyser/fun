// Exact solver for Senet (the rules used on harrisonkeyser.fun/senet).
//
// For every position, computes the probability that the player about to roll wins, assuming both
// players play perfectly from then on. Perfect play is what the website's Grandmaster will use.
//
// HOW IT WORKS
//   - A position is stored from the point of view of the player about to roll: `me` and `op` are
//     30-bit masks (bit h-1 set = a pawn on house h). The rules treat both colors the same, so this
//     view halves the work.
//   - A pawn can never stay on house 27 (the House of Water sends it straight back), so tables only
//     cover the other 29 houses ("slots").
//   - Positions are grouped into layers by how many pawns each side still has on the board. A borne-off
//     pawn never returns, so play only moves to the same pair of layers or to a later one. Layers are
//     solved from the end of the game backwards and saved to disk as they finish.
//   - Within a pair of layers, captures and the House of Water create loops, so values are found by
//     value iteration: start from a guess and repeatedly apply
//         V(s) = sum over rolls r of P(r) * max over legal moves m of [1 - V(position after m)]
//     until nothing changes. A position with no legal moves passes the turn.
//   - Values are stored as 16-bit integers (probability x 65535) to fit the full game in 16 GB of RAM.
//
// BUILD
//   g++ -O3 -march=native -fopenmp -o solver solver.cpp          (Linux / macOS with Homebrew gcc)
//   g++ -O3 -march=native -fopenmp -o solver.exe solver.cpp      (Windows, MSYS2 UCRT64)
//
// COMMANDS (run the solver with no arguments for the full list)
//   solve <pawns> --data <folder>     Solve and save every layer. Safe to stop and restart: it resumes.
//   verify <pawns> --data <folder>    Recompute every saved position from its successors; report the error.
//   simulate <pawns> --data <folder>  Play games: perfect vs. perfect, vs. the website's Medium AI, vs. random.
//   certify <pawns>                   Prove the answer is unique with lower/upper bounds (small games only).
//   benchmark <pawns> <a> <b>         Time sweeps of one layer.
//   check                             Print legal moves for positions on stdin (used by cross-check.mjs).

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <filesystem>
#include <random>
#include <string>
#include <vector>
#ifdef __BMI2__
#include <immintrin.h>
#endif
#ifdef _OPENMP
#include <omp.h>
#endif
#ifdef _WIN32
#ifndef NOMINMAX  // MSYS2's compiler already defines it
#define NOMINMAX
#endif
#include <windows.h>
#else
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace fs = std::filesystem;
using u16 = uint16_t;
using u32 = uint32_t;
using u64 = uint64_t;
using Clock = std::chrono::steady_clock;

static double secondsSince(Clock::time_point start) {
  return std::chrono::duration<double>(Clock::now() - start).count();
}

constexpr int HOUSES = 30;
constexpr u32 BOARD_MASK = (1u << HOUSES) - 1;
constexpr u32 FIRST_ROW_MASK = (1u << 10) - 1;
constexpr int SLOTS = 29;
constexpr u32 SLOT_MASK = BOARD_MASK & ~(1u << 26);  // every house except 27
constexpr u32 ALL_SLOTS = (1u << SLOTS) - 1;

// Probability of each roll 1..5 with four two-sided sticks (no light sides counts as 5).
constexpr double ROLL_PROBABILITY[6] = {0, 4 / 16.0, 6 / 16.0, 4 / 16.0, 1 / 16.0, 1 / 16.0};

// How values are stored. Changes are always measured in "units" of 1/65535 so tolerances mean the same
// thing in both formats.
constexpr double SCALE = 65535.0;

template <typename T>
struct Storage;

// Compact: probability x 65535 in 2 bytes. Fits the full game in 16 GB of RAM.
template <>
struct Storage<u16> {
  static constexpr const char* NAME = "16-bit";
  static constexpr const char* EXTENSION = ".u16";
  static constexpr double DEFAULT_TOLERANCE = 1;  // units
  static double get(u16 v) { return v / SCALE; }
  static u16 nearest(double p) { return (u16)std::lround(std::clamp(p, 0.0, 1.0) * SCALE); }
  static u16 below(double p) { return (u16)std::floor(std::clamp(p, 0.0, 1.0) * SCALE + 1e-9); }
  static u16 above(double p) { return (u16)std::ceil(std::clamp(p, 0.0, 1.0) * SCALE - 1e-9); }
  static double unitsBetween(u16 x, u16 y) { return std::abs((int)x - (int)y); }
};

// Precise: 32-bit floating point (about 7 significant digits). Needs about 32 GB of RAM for the full game.
template <>
struct Storage<float> {
  static constexpr const char* NAME = "32-bit precise";
  static constexpr const char* EXTENSION = ".f32";
  static constexpr double DEFAULT_TOLERANCE = 0.01;  // units, i.e. about 1.5e-7
  static double get(float v) { return v; }
  static float nearest(double p) { return (float)std::clamp(p, 0.0, 1.0); }
  static float below(double p) { return std::max(0.0f, std::nextafter((float)p, 0.0f)); }
  static float above(double p) { return std::min(1.0f, std::nextafter((float)p, 1.0f)); }
  static double unitsBetween(float x, float y) { return std::fabs((double)x - y) * SCALE; }
};

// =============================================================== rules (mirror of senetRules.js)

enum MoveType { MOVE = 0, CAPTURE = 1, WATER = 2, BEAR_OFF = 3 };

struct Move {
  int from;
  int landsOn;  // 0 for bear-off
  MoveType type;
};

inline u32 bit(int house) { return 1u << (house - 1); }
inline bool has(u32 mask, int house) { return house >= 1 && house <= HOUSES && (mask & bit(house)); }

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

// =============================================================== position <-> index

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

// Next larger integer with the same number of set bits (Gosper's hack): walks sets in rank order.
inline u32 nextCombination(u32 set) {
  const u32 lowest = set & -set;
  const u32 ripple = set + lowest;
  return ripple | (((set ^ ripple) >> 2) / lowest);
}

// =============================================================== files

// Lets the operating system load a saved layer from disk on demand (and evict it under memory pressure).
struct MappedFile {
  const void* data = nullptr;
  u64 bytes = 0;
#ifdef _WIN32
  HANDLE file = INVALID_HANDLE_VALUE, mapping = nullptr;
#else
  int fd = -1;
#endif

  bool open(const fs::path& path) {
    close();
#ifdef _WIN32
    file = CreateFileW(path.wstring().c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr, OPEN_EXISTING,
                       FILE_ATTRIBUTE_NORMAL | FILE_FLAG_RANDOM_ACCESS, nullptr);
    if (file == INVALID_HANDLE_VALUE) return false;
    LARGE_INTEGER size;
    GetFileSizeEx(file, &size);
    bytes = (u64)size.QuadPart;
    mapping = CreateFileMappingW(file, nullptr, PAGE_READONLY, 0, 0, nullptr);
    if (!mapping) return false;
    data = MapViewOfFile(mapping, FILE_MAP_READ, 0, 0, 0);
#else
    fd = ::open(path.c_str(), O_RDONLY);
    if (fd < 0) return false;
    struct stat info;
    fstat(fd, &info);
    bytes = (u64)info.st_size;
    void* view = mmap(nullptr, bytes, PROT_READ, MAP_SHARED, fd, 0);
    if (view == MAP_FAILED) return false;
    madvise(view, bytes, MADV_RANDOM);
    data = view;
#endif
    return data != nullptr;
  }

  void close() {
#ifdef _WIN32
    if (data) UnmapViewOfFile(data);
    if (mapping) CloseHandle(mapping);
    if (file != INVALID_HANDLE_VALUE) CloseHandle(file);
    mapping = nullptr;
    file = INVALID_HANDLE_VALUE;
#else
    if (data) munmap((void*)data, bytes);
    if (fd >= 0) ::close(fd);
    fd = -1;
#endif
    data = nullptr;
    bytes = 0;
  }

  ~MappedFile() { close(); }
};

// Writes a large array safely: write to a temporary file, then rename it over the target.
template <typename T>
bool writeArray(const fs::path& path, const T* data, u64 count) {
  const fs::path temporary = path.string() + ".tmp";
  FILE* file = fopen(temporary.string().c_str(), "wb");
  if (!file) return false;
  constexpr u64 CHUNK = 1ull << 26;  // 64M values (128 MB) per write
  for (u64 offset = 0; offset < count; offset += CHUNK) {
    const u64 n = std::min(CHUNK, count - offset);
    if (fwrite(data + offset, sizeof(T), n, file) != n) {
      fclose(file);
      return false;
    }
  }
  if (fclose(file) != 0) return false;
  std::error_code ignored;
  fs::remove(path, ignored);
  fs::rename(temporary, path);
  return true;
}

template <typename T>
bool readArray(const fs::path& path, T* data, u64 count) {
  std::error_code error;
  if (fs::file_size(path, error) != count * sizeof(T) || error) return false;
  FILE* file = fopen(path.string().c_str(), "rb");
  if (!file) return false;
  constexpr u64 CHUNK = 1ull << 26;
  for (u64 offset = 0; offset < count; offset += CHUNK) {
    const u64 n = std::min(CHUNK, count - offset);
    if (fread(data + offset, sizeof(T), n, file) != n) {
      fclose(file);
      return false;
    }
  }
  fclose(file);
  return true;
}

// =============================================================== the solver

template <typename T>
struct Layer {
  int mine = 0, theirs = 0;
  u64 opponentPlacements = 0;  // C(29 - mine, theirs)
  u64 size = 0;                // number of positions
  const T* values = nullptr;   // what lookups read: `owned` or a mapped file
  std::vector<T> owned;        // in memory and writable (the layer being solved)
  MappedFile mapped;           // saved on disk, read-only
  std::vector<T> upper;        // certify mode only: upper bounds (`owned` holds the lower bounds)

  u64 bytes() const { return size * sizeof(T); }
  void release() {
    owned.clear();
    owned.shrink_to_fit();
    upper.clear();
    upper.shrink_to_fit();
    mapped.close();
    values = nullptr;
  }
};

using LayerId = std::pair<int, int>;

template <typename T>
struct Solver {
  using S = Storage<T>;
  using Layer = ::Layer<T>;
  int pawns;
  fs::path dataFolder;
  std::vector<Layer> layers;  // indexed [mine * (pawns + 1) + theirs]

  explicit Solver(int pawnsPerSide, fs::path folder = {})
      : pawns(pawnsPerSide), dataFolder(std::move(folder)), layers((pawnsPerSide + 1) * (pawnsPerSide + 1)) {
    for (int a = 0; a <= pawns; a++)
      for (int b = 0; b <= pawns; b++) {
        Layer& layer = layerFor(a, b);
        layer.mine = a;
        layer.theirs = b;
        layer.opponentPlacements = BINOMIAL[SLOTS - a][b];
        layer.size = BINOMIAL[SLOTS][a] * layer.opponentPlacements;
      }
  }

  Layer& layerFor(int mine, int theirs) { return layers[mine * (pawns + 1) + theirs]; }

  fs::path layerPath(int a, int b) const {
    return dataFolder /
           ("senet" + std::to_string(pawns) + "-layer-" + std::to_string(a) + "-" + std::to_string(b) + S::EXTENSION);
  }
  fs::path checkpointPath(int a, int b) const { return layerPath(a, b).string() + ".checkpoint"; }

  bool isSaved(int a, int b) {
    std::error_code error;
    const u64 bytes = fs::file_size(layerPath(a, b), error);
    return !error && bytes == layerFor(a, b).bytes();
  }

  // Makes a finished layer readable, mapping it from disk if it isn't already in memory.
  void useSavedLayer(int a, int b) {
    Layer& layer = layerFor(a, b);
    if (layer.values) return;
    if (!isSaved(a, b) || !layer.mapped.open(layerPath(a, b))) {
      fprintf(stderr, "Missing or unreadable %s\n", layerPath(a, b).string().c_str());
      exit(1);
    }
    layer.values = (const T*)layer.mapped.data;
  }

  u64 index(const Layer& layer, u32 me, u32 op) const {
    const u32 mySlots = extractBits(me, SLOT_MASK);
    const u32 freeSlots = ~mySlots & ALL_SLOTS;
    return combinationRank(mySlots) * layer.opponentPlacements +
           combinationRank(extractBits(extractBits(op, SLOT_MASK), freeSlots));
  }

  template <bool readUpper = false>
  const T* slotFor(u32 me, u32 op) {
    Layer& layer = layerFor(__builtin_popcount(me), __builtin_popcount(op));
    return (readUpper ? layer.upper.data() : layer.values) + index(layer, me, op);
  }

  double valueOf(u32 me, u32 op) { return S::get(*slotFor(me, op)); }

  // Win probability for the player about to roll, from the current values of the positions it leads to.
  // All successor values are located and prefetched first, so their memory loads overlap instead of
  // happening one at a time. If `bestMoves` is given, also records the best move for each roll (-1 = pass).
  // readUpper: read the opponent's upper bounds (certify mode, to compute a guaranteed lower bound).
  template <bool readUpper = false>
  double evaluate(u32 me, u32 op, int* bestMoves = nullptr) {
    Move moves[5][8];
    int counts[5];
    const T* successor[5][8];  // nullptr = this move wins the game outright
    for (int r = 0; r < 5; r++) {
      counts[r] = legalMoves(me, op, r + 1, moves[r]);
      if (counts[r] == 0) {
        successor[r][0] = slotFor<readUpper>(op, me);  // pass
        __builtin_prefetch(successor[r][0]);
        continue;
      }
      for (int i = 0; i < counts[r]; i++) {
        u32 nextMe = me, nextOp = op;
        applyMove(nextMe, nextOp, moves[r][i]);
        successor[r][i] = nextMe == 0 ? nullptr : slotFor<readUpper>(nextOp, nextMe);
        if (successor[r][i]) __builtin_prefetch(successor[r][i]);
      }
    }

    double total = 0;
    for (int r = 0; r < 5; r++) {
      double best = -1;
      int bestIndex = -1;
      if (counts[r] == 0) {
        best = 1.0 - S::get(*successor[r][0]);
      } else {
        for (int i = 0; i < counts[r]; i++) {
          const double result = successor[r][i] ? 1.0 - S::get(*successor[r][i]) : 1.0;
          if (result > best) {
            best = result;
            bestIndex = i;
          }
        }
      }
      if (bestMoves) bestMoves[r + 1] = bestIndex;
      total += ROLL_PROBABILITY[r + 1] * best;
    }
    return total;
  }

  // Visits every position of a layer in storage order, in parallel: fn(me, op, index).
  // Returns the maximum of what fn returns.
  template <typename Fn>
  double forEachPosition(const Layer& layer, Fn fn) {
    const int a = layer.mine, b = layer.theirs;
    std::vector<u32> mySlotSets;
    for (u32 set = (1u << a) - 1; set <= ALL_SLOTS; set = nextCombination(set)) mySlotSets.push_back(set);
    double largest = 0;
#pragma omp parallel for schedule(dynamic, 16) reduction(max : largest)
    for (size_t i = 0; i < mySlotSets.size(); i++) {
      const u32 me = depositBits(mySlotSets[i], SLOT_MASK);
      const u32 freeSlots = ~mySlotSets[i] & ALL_SLOTS;
      const u32 limit = (1u << (SLOTS - a)) - 1;
      u64 j = i * layer.opponentPlacements;
      for (u32 compact = (1u << b) - 1; compact <= limit; compact = nextCombination(compact), j++) {
        const u32 op = depositBits(depositBits(compact, freeSlots), SLOT_MASK);
        largest = std::max(largest, fn(me, op, j));
      }
    }
    return largest;
  }

  // One in-place pass over a layer. Returns the largest change in units (1 unit = 1/65535).
  double sweep(Layer& layer) {
    T* values = layer.owned.data();
    return forEachPosition(layer, [&](u32 me, u32 op, u64 j) {
      const T updated = S::nearest(evaluate(me, op));
      const double change = S::unitsBetween(updated, values[j]);
      values[j] = updated;
      return change;
    });
  }

  // Certify mode: tightens lower bounds (in `owned`) and upper bounds. Returns the widest gap in units.
  double sweepBounds(Layer& layer) {
    T* low = layer.owned.data();
    T* high = layer.upper.data();
    return forEachPosition(layer, [&](u32 me, u32 op, u64 j) {
      low[j] = std::max(low[j], S::below(evaluate<true>(me, op)));
      high[j] = std::min(high[j], S::above(evaluate<false>(me, op)));
      return S::unitsBetween(high[j], low[j]);
    });
  }

  // Layer groups in the order they must be solved (fewer pawns left on the board first).
  // Each group is a layer plus its mirror image (a,b) & (b,a), which depend on each other.
  std::vector<LayerId> solveOrder() const {
    std::vector<LayerId> order;
    for (int total = 2; total <= 2 * pawns; total++)
      for (int a = std::max(1, total - pawns); a <= std::min(pawns, total - 1); a++)
        if (a <= total - a) order.push_back({a, total - a});
    return order;
  }

  static std::vector<LayerId> group(int a, int b) {
    if (a == b) return {{a, b}};
    return {{a, b}, {b, a}};
  }

  // Layers reached by bearing off from a group: from (a,b) to (b,a-1), and from (b,a) to (a,b-1).
  std::vector<LayerId> dependencies(int a, int b) const {
    std::vector<LayerId> deps;
    if (a > 1) deps.push_back({b, a - 1});
    if (b > 1 && a != b) deps.push_back({a, b - 1});
    return deps;
  }

  void releaseAllExcept(const std::vector<LayerId>& keep) {
    for (Layer& layer : layers)
      if (std::find(keep.begin(), keep.end(), LayerId{layer.mine, layer.theirs}) == keep.end()) layer.release();
  }

  // Solves every layer, saving each to disk. Skips saved layers and resumes from checkpoints.
  void solve(double toleranceUnits, double checkpointMinutes) {
    fs::create_directories(dataFolder);
    const auto runStart = Clock::now();

    for (auto [a, b] : solveOrder()) {
      const auto members = group(a, b);
      const char* mirror = a != b ? " & reverse" : "          ";

      bool done = true;
      for (auto [x, y] : members) done = done && isSaved(x, y);
      if (done) {
        printf("  layers %d-%d%s: already saved, skipping\n", a, b, mirror);
        fflush(stdout);
        continue;
      }

      std::vector<LayerId> needed = members;
      for (auto dep : dependencies(a, b)) needed.push_back(dep);
      releaseAllExcept(needed);
      for (auto [x, y] : dependencies(a, b)) useSavedLayer(x, y);

      u64 positions = 0;
      bool resumed = false;
      for (auto [x, y] : members) {
        Layer& layer = layerFor(x, y);
        layer.mapped.close();
        layer.owned.assign(layer.size, S::nearest(0.5));
        if (readArray(checkpointPath(x, y), layer.owned.data(), layer.size)) resumed = true;
        layer.values = layer.owned.data();
        positions += layer.size;
      }
      if (resumed) printf("  layers %d-%d%s: resuming from checkpoint\n", a, b, mirror);

      const auto start = Clock::now();
      auto lastCheckpoint = Clock::now();
      const bool big = positions > 50'000'000;
      int sweeps = 0, sinceImprovement = 0;
      double change, smallest = 1e300;
      do {
        const auto sweepStart = Clock::now();
        change = 0;
        for (auto [x, y] : members) change = std::max(change, sweep(layerFor(x, y)));
        sweeps++;
        if (big) {
          printf("    layers %d-%d sweep %d: largest change %.0f units (stops at %.0f), %.0f s\n", a, b, sweeps,
                 change, toleranceUnits, secondsSince(sweepStart));
          fflush(stdout);
        }
        if (change > toleranceUnits && secondsSince(lastCheckpoint) > 60 * checkpointMinutes) {
          for (auto [x, y] : members)
            writeArray(checkpointPath(x, y), layerFor(x, y).owned.data(), layerFor(x, y).size);
          printf("    checkpoint saved\n");
          fflush(stdout);
          lastCheckpoint = Clock::now();
        }
        if (change < smallest * 0.999) smallest = change, sinceImprovement = 0;
        else sinceImprovement++;
      } while (change > toleranceUnits && !(sinceImprovement >= 30 && change < 20));  // 20 units: only a rounding plateau
      if (change > toleranceUnits)
        printf("    note: stopped at a change of %.3f units, the limit of this storage format's rounding\n", change);

      for (auto [x, y] : members) {
        Layer& layer = layerFor(x, y);
        if (!writeArray(layerPath(x, y), layer.owned.data(), layer.size)) {
          fprintf(stderr, "Could not save %s (is the disk full?)\n", layerPath(x, y).string().c_str());
          exit(1);
        }
        std::error_code ignored;
        fs::remove(checkpointPath(x, y), ignored);
      }
      const double seconds = secondsSince(start);
      printf("  layers %d-%d%s: %13llu positions, %4d sweeps, %8.1f s, %6.1f ns/position/sweep  (total %.1f min)\n",
             a, b, mirror, (unsigned long long)positions, sweeps, seconds,
             1e9 * seconds / ((double)positions * sweeps), secondsSince(runStart) / 60);
      fflush(stdout);
    }
  }

  // Makes every saved layer readable (mapped from disk; the OS loads only what's used).
  void useAllSavedLayers() {
    for (auto [a, b] : solveOrder())
      for (auto [x, y] : group(a, b)) useSavedLayer(x, y);
  }

  // Recomputes every saved position from its successors. Returns the largest disagreement (probability).
  double verify() {
    double worst = 0;
    for (auto [a, b] : solveOrder()) {
      const auto members = group(a, b);
      std::vector<LayerId> needed = members;
      for (auto dep : dependencies(a, b)) needed.push_back(dep);
      releaseAllExcept(needed);
      for (auto [x, y] : needed) useSavedLayer(x, y);
      for (auto [x, y] : members) {
        const Layer& layer = layerFor(x, y);
        const double err = forEachPosition(
            layer, [&](u32 me, u32 op, u64 j) { return std::fabs(evaluate(me, op) - S::get(layer.values[j])); });
        printf("  layer %d-%d: largest error %.2e\n", x, y, err);
        fflush(stdout);
        worst = std::max(worst, err);
      }
    }
    return worst;
  }

  // Certify mode (in memory; small games): bounds that every valid solution must lie between.
  void certify(double toleranceUnits) {
    for (auto [a, b] : solveOrder()) {
      const auto members = group(a, b);
      for (auto [x, y] : members) {
        Layer& layer = layerFor(x, y);
        layer.owned.assign(layer.size, S::nearest(0.0));
        layer.upper.assign(layer.size, S::nearest(1.0));
        layer.values = layer.owned.data();
      }
      // Stop when the bounds are close enough, or when they stop getting closer (rounding limit).
      int sweeps = 0, sinceImprovement = 0;
      double gap, narrowest = 1e300;
      do {
        gap = 0;
        for (auto [x, y] : members) gap = std::max(gap, sweepBounds(layerFor(x, y)));
        sweeps++;
        if (gap < narrowest * 0.999) narrowest = gap, sinceImprovement = 0;
        else sinceImprovement++;
      } while (gap > toleranceUnits && sinceImprovement < 30);
      printf("  layers %d-%d: bounds within %.2f units (%.1e) after %d sweeps\n", a, b, gap, gap / SCALE, sweeps);
      fflush(stdout);
    }
  }
};

// =============================================================== simulation

int rollSticks(std::mt19937_64& rng) {
  const int lights = __builtin_popcount(rng() & 0xF);
  return lights == 0 ? 5 : lights;
}

u32 startingPawns(int pawns, bool evenHouses) {
  u32 mask = 0;
  for (int i = 0; i < pawns; i++) mask |= bit(2 * i + (evenHouses ? 2 : 1));
  return mask;
}

enum Player { RANDOM, MEDIUM, PERFECT };

// The website's Medium computer: bear off > safe house > capture > ordinary move > House of Water.
int mediumPriority(const Move& move) {
  if (move.type == BEAR_OFF) return 0;
  if (move.type != WATER && (move.landsOn == 26 || move.landsOn == 28 || move.landsOn == 29)) return 1;
  if (move.type == CAPTURE) return 2;
  if (move.type == WATER) return 4;
  return 3;
}

template <typename SolverT>
int chooseMove(SolverT& solver, Player who, u32 me, u32 op, int roll, const Move* moves, int count,
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

// The perfect player against `opponent`, alternating who moves first.
// Returns { perfect player's win rate, first mover's win rate }.
template <typename SolverT>
std::pair<double, double> simulate(SolverT& solver, Player opponent, int games, std::mt19937_64& rng) {
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
        const Player who = toMove == perfectSeat ? PERFECT : opponent;
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

// =============================================================== command line

void usage() {
  printf(
      "Senet solver\n\n"
      "  solver solve <pawns> --data <folder> [--precise] [--tolerance <units>] [--checkpoint-minutes <m>]\n"
      "      Solve the game and save every layer in <folder>. If stopped, run the same command to resume.\n"
      "      Values are 16-bit by default; --precise stores 32-bit values (twice the memory and disk).\n"
      "      Every command below takes --precise too, to read 32-bit results.\n"
      "      Defaults: stop when no value changes by more than 1 unit (1/65535), or 0.01 units with\n"
      "      --precise; save a checkpoint every 20 minutes.\n"
      "  solver verify <pawns> --data <folder>\n"
      "      Recompute every saved position from the positions it leads to; report the largest error.\n"
      "  solver simulate <pawns> --data <folder> [--games <n>]\n"
      "      Perfect vs. perfect, vs. the website's Medium AI, and vs. random (default 100000 games each).\n"
      "  solver certify <pawns> [tolerance units, default 1] [--data <folder>]\n"
      "      Prove the solution is unique with 32-bit lower/upper bounds (in memory; small games only).\n"
      "      With --data, also checks how far a saved solution is from the proven bounds.\n"
      "  solver benchmark <pawns> <a> <b> [sweeps]\n"
      "      Time sweeps of one layer (neighbors filled with placeholder values).\n"
      "  solver check\n"
      "      Print legal moves for '<me mask> <op mask> <roll>' lines on standard input.\n");
}

struct Options {
  int pawns = 0;
  fs::path data;
  double tolerance = -1;  // units; -1 = the storage format's default
  double checkpointMinutes = 20;
  int games = 100000;
  std::vector<std::string> positional;
  int threads = 1;
};

template <typename T>
int run(const std::string& command, const Options& opt) {
  using S = Storage<T>;
  Solver<T> solver(opt.pawns, opt.data);
  const int pawns = opt.pawns;
  const double tolerance = opt.tolerance >= 0 ? opt.tolerance : S::DEFAULT_TOLERANCE;
  const u32 first = startingPawns(pawns, true), second = startingPawns(pawns, false);
  u64 positions = 0;
  for (auto [a, b] : solver.solveOrder())
    for (auto [x, y] : Solver<T>::group(a, b)) positions += solver.layerFor(x, y).size;

  if ((command == "solve" || command == "verify" || command == "simulate") && opt.data.empty()) {
    fprintf(stderr, "Please give a folder for the saved layers with --data <folder>\n");
    return 1;
  }

  if (command == "solve") {
    printf("Solving %d-pawn Senet (%s): %llu positions, %.1f GB on disk, %d threads\n", pawns, S::NAME,
           (unsigned long long)positions, positions * sizeof(T) / 1e9, opt.threads);
    fflush(stdout);
    const auto start = Clock::now();
    solver.solve(tolerance, opt.checkpointMinutes);
    printf("Done in %.1f minutes.\n", secondsSince(start) / 60);
    solver.releaseAllExcept({});
    solver.useSavedLayer(pawns, pawns);
    printf("Starting position: first player wins %.4f%% with perfect play by both sides\n",
           100 * solver.valueOf(first, second));
    return 0;
  }

  if (command == "verify") {
    printf("Verifying %d-pawn Senet (%s, %llu positions)\n", pawns, S::NAME, (unsigned long long)positions);
    const double worst = solver.verify();
    printf("Largest error over every position: %.2e\n", worst);
    return 0;
  }

  if (command == "simulate") {
    solver.useAllSavedLayers();
    std::mt19937_64 rng(12345);
    const double predicted = solver.valueOf(first, second);
    const double firstMover = simulate(solver, PERFECT, opt.games, rng).second;
    printf("Perfect vs. perfect (%d games): first mover won %.2f%%  (predicted %.2f%%)\n", opt.games,
           100 * firstMover, 100 * predicted);
    printf("Perfect vs. Medium  (%d games): perfect won %.2f%%\n", opt.games,
           100 * simulate(solver, MEDIUM, opt.games, rng).first);
    printf("Perfect vs. random  (%d games): perfect won %.2f%%\n", opt.games,
           100 * simulate(solver, RANDOM, opt.games, rng).first);
    return 0;
  }

  if (command == "benchmark" && opt.positional.size() >= 2) {
    const int a = atoi(opt.positional[0].c_str()), b = atoi(opt.positional[1].c_str());
    const int sweeps = opt.positional.size() >= 3 ? atoi(opt.positional[2].c_str()) : 2;
    for (auto [x, y] : {LayerId{a, b}, LayerId{b, a}, LayerId{b, a - 1}}) {
      if (x < 1 || y < 1) continue;
      auto& layer = solver.layerFor(x, y);
      if (layer.owned.empty()) {
        layer.owned.assign(layer.size, S::nearest(0.5));
        layer.values = layer.owned.data();
      }
    }
    auto& target = solver.layerFor(a, b);
    for (int s = 0; s < sweeps; s++) {
      const auto start = Clock::now();
      solver.sweep(target);
      const double seconds = secondsSince(start);
      printf("layer %d-%d (%s): %llu positions, sweep %.1f s, %.1f ns/position (%d threads)\n", a, b, S::NAME,
             (unsigned long long)target.size, seconds, 1e9 * seconds / target.size, opt.threads);
      fflush(stdout);
    }
    return 0;
  }

  usage();
  return 1;
}

// Certification always uses 32-bit precision; with --data it also checks a saved solution against the bounds.
template <typename Saved>
int certify(const Options& opt) {
  Solver<float> bounds(opt.pawns);
  const double tolerance = opt.positional.empty() ? 1 : atof(opt.positional[0].c_str());
  const u32 first = startingPawns(opt.pawns, true), second = startingPawns(opt.pawns, false);
  printf("Certifying %d-pawn Senet: bounds must close to %.2f units (%.1e)\n", opt.pawns, tolerance, tolerance / SCALE);
  bounds.certify(tolerance);
  printf("Starting position: first player wins between %.5f%% and %.5f%%\n", 100 * bounds.valueOf(first, second),
         100 * Storage<float>::get(*bounds.slotFor<true>(first, second)));
  if (opt.data.empty()) return 0;

  Solver<Saved> saved(opt.pawns, opt.data);
  double outside = 0, widest = 0;
  for (auto [a, b] : bounds.solveOrder())
    for (auto [x, y] : Solver<float>::group(a, b)) {
      saved.useSavedLayer(x, y);
      const auto& layer = bounds.layerFor(x, y);
      const Saved* answer = saved.layerFor(x, y).values;
      for (u64 i = 0; i < layer.size; i++) {
        const double v = Storage<Saved>::get(answer[i]);
        outside = std::max({outside, layer.owned[i] - v, v - layer.upper[i]});
        widest = std::max(widest, (double)layer.upper[i] - layer.owned[i]);
      }
    }
  printf("Widest proven range: %.2e. Saved %s solution lies outside the proven range by at most %.2e\n", widest,
         Storage<Saved>::NAME, outside);
  return 0;
}

int main(int argc, char** argv) {
  initBinomials();
  if (argc < 2) {
    usage();
    return 1;
  }
  const std::string command = argv[1];

  if (command == "check") {
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

  if (argc < 3) {
    usage();
    return 1;
  }
  Options opt;
  opt.pawns = atoi(argv[2]);
  if (opt.pawns < 1 || opt.pawns > 5) {
    fprintf(stderr, "pawns must be 1 to 5\n");
    return 1;
  }
  bool precise = false;
  for (int i = 3; i < argc; i++) {
    const std::string arg = argv[i];
    if (arg == "--data" && i + 1 < argc) opt.data = argv[++i];
    else if (arg == "--tolerance" && i + 1 < argc) opt.tolerance = atof(argv[++i]);
    else if (arg == "--checkpoint-minutes" && i + 1 < argc) opt.checkpointMinutes = atof(argv[++i]);
    else if (arg == "--games" && i + 1 < argc) opt.games = atoi(argv[++i]);
    else if (arg == "--precise") precise = true;
    else opt.positional.push_back(arg);
  }
#ifdef _OPENMP
  opt.threads = omp_get_max_threads();
#endif

  if (command == "certify") return precise ? certify<float>(opt) : certify<u16>(opt);
  return precise ? run<float>(command, opt) : run<u16>(command, opt);
}
