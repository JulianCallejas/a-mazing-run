import { isWalkable, walkableNeighbors, type GridPoint, type MazeGrid } from './maze';

/** Minimal binary min-heap keyed by a numeric priority. */
class MinHeap<T> {
  private items: Array<{ value: T; priority: number }> = [];

  get size(): number {
    return this.items.length;
  }

  push(value: T, priority: number): void {
    const items = this.items;
    items.push({ value, priority });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].priority <= items[i].priority) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    if (items.length === 0) return undefined;
    const top = items[0].value;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left].priority < items[smallest].priority) smallest = left;
        if (right < items.length && items[right].priority < items[smallest].priority) smallest = right;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i], items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

const manhattan = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.z - b.z);

/**
 * A* over the 4-connected maze grid. Returns the path from `start` to `goal`
 * (both included), or an empty array when either end is blocked or the goal
 * is unreachable.
 */
export const findPath = (grid: MazeGrid, start: GridPoint, goal: GridPoint): GridPoint[] => {
  if (!isWalkable(grid, start.x, start.z) || !isWalkable(grid, goal.x, goal.z)) return [];

  const width = grid[0].length;
  const key = (p: GridPoint) => p.z * width + p.x;
  const goalKey = key(goal);
  const cameFrom = new Map<number, number>();
  const cost = new Map<number, number>([[key(start), 0]]);
  const open = new MinHeap<GridPoint>();
  open.push(start, manhattan(start, goal));

  while (open.size > 0) {
    const current = open.pop()!;
    const currentKey = key(current);
    if (currentKey === goalKey) {
      const path: GridPoint[] = [];
      let k: number | undefined = currentKey;
      while (k !== undefined) {
        path.push({ x: k % width, z: Math.floor(k / width) });
        k = cameFrom.get(k);
      }
      return path.reverse();
    }

    const currentCost = cost.get(currentKey)!;
    for (const next of walkableNeighbors(grid, current)) {
      const nextKey = key(next);
      const nextCost = currentCost + 1;
      if (nextCost < (cost.get(nextKey) ?? Infinity)) {
        cost.set(nextKey, nextCost);
        cameFrom.set(nextKey, currentKey);
        open.push(next, nextCost + manhattan(next, goal));
      }
    }
  }
  return [];
};
