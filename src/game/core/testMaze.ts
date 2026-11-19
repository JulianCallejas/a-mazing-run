import { Cell, type GridPoint, type Maze } from './maze';

/**
 * Test helper: builds a maze from ASCII rows.
 * `#` wall, `.` path, `S` start, `E` exit.
 */
export const mazeFromRows = (rows: string[]): Maze => {
  let start: GridPoint | null = null;
  let exit: GridPoint | null = null;
  const grid = rows.map((row, z) =>
    [...row].map((char, x) => {
      switch (char) {
        case '#':
          return Cell.Wall;
        case 'S':
          start = { x, z };
          return Cell.Start;
        case 'E':
          exit = { x, z };
          return Cell.Exit;
        default:
          return Cell.Path;
      }
    }),
  );
  if (!start || !exit) throw new Error('Test maze needs S and E');
  return { grid, width: rows[0].length, height: rows.length, start, exit, seed: 0 };
};
