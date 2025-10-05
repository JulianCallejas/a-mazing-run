interface Node {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost
  parent: Node | null;
}

export class AStar {
  private maze: number[][];
  private width: number;
  private height: number;

  constructor(maze: number[][]) {
    this.maze = maze;
    this.height = maze.length;
    this.width = maze[0].length;
  }

  public findPath(
    startX: number,
    startY: number,
    goalX: number,
    goalY: number
  ): Array<{x: number, y: number}> {
    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    
    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, goalX, goalY),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node with lowest f score
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet.splice(currentIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      closedSet.add(currentKey);

      // Check if we reached the goal
      if (current.x === goalX && current.y === goalY) {
        return this.reconstructPath(current);
      }

      // Check all neighbors
      const neighbors = this.getNeighbors(current.x, current.y);
      
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        
        if (closedSet.has(neighborKey)) {
          continue;
        }

        const tentativeG = current.g + 1;
        
        // Check if this neighbor is already in open set
        const existingIndex = openSet.findIndex(
          node => node.x === neighbor.x && node.y === neighbor.y
        );

        if (existingIndex === -1) {
          // New node
          const newNode: Node = {
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: this.heuristic(neighbor.x, neighbor.y, goalX, goalY),
            f: 0,
            parent: current
          };
          newNode.f = newNode.g + newNode.h;
          openSet.push(newNode);
        } else if (tentativeG < openSet[existingIndex].g) {
          // Better path to existing node
          openSet[existingIndex].g = tentativeG;
          openSet[existingIndex].f = tentativeG + openSet[existingIndex].h;
          openSet[existingIndex].parent = current;
        }
      }
    }

    // No path found
    return [];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  private getNeighbors(x: number, y: number): Array<{x: number, y: number}> {
    const neighbors: Array<{x: number, y: number}> = [];
    const directions = [
      {x: 0, y: -1}, // Up
      {x: 1, y: 0},  // Right
      {x: 0, y: 1},  // Down
      {x: -1, y: 0}  // Left
    ];

    for (const dir of directions) {
      const newX = x + dir.x;
      const newY = y + dir.y;

      if (this.isValidPosition(newX, newY)) {
        neighbors.push({x: newX, y: newY});
      }
    }

    return neighbors;
  }

  private isValidPosition(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x < this.width &&
      y >= 0 &&
      y < this.height &&
      this.maze[y][x] !== 1 // Not a wall
    );
  }

  private reconstructPath(node: Node): Array<{x: number, y: number}> {
    const path: Array<{x: number, y: number}> = [];
    let current: Node | null = node;

    while (current) {
      path.unshift({x: current.x, y: current.y});
      current = current.parent;
    }

    return path;
  }
}