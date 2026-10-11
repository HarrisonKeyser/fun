import styles from './SenetRules.module.css';

export default function SenetRules() {
  return (
    <section className={styles.rules} aria-labelledby="senet-rules-title">
      <h2 id="senet-rules-title">How to Play Egyptian Senet</h2>
      <p>
        The goal of the game is to move all five of your pawns across the Senet board and remove
        ("bear-off") them before your opponent does.
      </p>

      <h3>Setup:</h3>
      <ul>
        <li>Each player has 5 pawns.</li>
        <li>
          Pawns are placed alternating colors on squares 1-10 (each square is called a "house").
          One player begins in houses 1, 3, 5, 7, 9. The other player begins in houses 2, 4, 6, 8,
          10.
        </li>
        <li>The player whose pawns are in houses 2, 4, 6, 8, 10 gets the first move.</li>
      </ul>

      <h3>Casting Sticks:</h3>
      <ul>
        <li>Players roll four flat sticks — each with one light and one dark side.</li>
        <li>
          The number of light sides facing up determines how far a pawn can move:
          <ul>
            <li>1 light = Move 1 square</li>
            <li>2 lights = Move 2 squares</li>
            <li>3 lights = Move 3 squares</li>
            <li>4 lights = Move 4 squares</li>
            <li>0 lights (all dark) = Move 5 squares</li>
          </ul>
        </li>
      </ul>

      <h3>Movement:</h3>
      <ul>
        <li>
          Pawns move through houses in a zig-zag pattern: the upper-left corner is house 1, and the
          upper-right corner is house 10. In the second row, the rightmost house is house 11, and
          the leftmost house is house 20. In the third row, the lower-left corner is house 21, and
          the lower-right corner is house 30.
        </li>
        <li>Players take turns rolling and moving a single pawn.</li>
        <li>Two pawns cannot both occupy the same house.</li>
        <li>
          Capturing: If a pawn lands on a house occupied by an opponent, the two pawns swap places.
        </li>
        <li>Two adjacent pawns of the same color protect each other and cannot be captured.</li>
        <li>
          Three adjacent pawns of the same color form a blockade — they cannot be captured or passed
          by an opponent.
        </li>
        <li>
          If a player has no moves, they forfeit their turn. If a player has one or more legal
          moves, they must play a legal move.
        </li>
      </ul>

      <h3>Special Houses:</h3>
      <ul>
        <li>A pawn must be in house 26, 28, 29, or 30 to be borne-off the board.</li>
        <li>
          <strong>House 15 – House of Rebirth:</strong> Pawns are returned to this house if they
          land on House 27. Pawns cannot be captured while in this house.
        </li>
        <li>
          <strong>House 26 – House of Happiness:</strong> All pawns must land here before continuing
          along the board. Pawns in this house can be borne-off by rolling a 5.
        </li>
        <li>
          <strong>House 27 – House of Water:</strong> Pawns landing here must return to House 15 or
          the first empty house before it.
        </li>
        <li>
          <strong>House 28 – House of Three Truths:</strong> Pawns entering this house become stuck;
          they cannot be captured and can only be removed by rolling exactly a 3.
        </li>
        <li>
          <strong>House 29 – House of Re-Atoum:</strong> Pawns entering this house become stuck;
          they cannot be captured and can only be removed by rolling exactly a 2.
        </li>
        <li>
          <strong>House 30 – House of Horus:</strong> The final house. Pawns in this house can be
          captured. To bear-off pawns from this house, roll exactly a 1. If houses 1–10 are all
          empty, pawns occupying this house can be borne-off with any roll.
        </li>
      </ul>
    </section>
  );
}
