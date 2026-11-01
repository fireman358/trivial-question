// Déplacement exact : le dé impose son nombre de pas, sans demi-tour.

export function exactPaths(board, startId, steps, hasAllWedges) {
  let frontier = new Map([[startId + "|", [startId]]]);
  for (let s = 0; s < steps; s++) {
    const next = new Map();
    for (const [state, path] of frontier) {
      const [cell, prev] = state.split("|");
      for (const n of board.adj[cell]) {
        if (n === prev) continue;
        const key = n + "|" + cell;
        if (!next.has(key)) next.set(key, [...path, n]);
      }
    }
    frontier = next;
  }
  const paths = {};
  for (const path of frontier.values()) {
    const dest = path[path.length - 1];
    if (board.cells[dest].isCenter && !hasAllWedges) continue;
    if (!paths[dest]) paths[dest] = path;
  }
  return paths;
}

