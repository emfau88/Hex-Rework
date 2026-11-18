// Pointy-top axial hexes with radius 1: x = √3·(q + r/2), z = 1.5·r.

export const SQ3 = Math.sqrt(3);

// Corner i sits at angle 30° + i·60°. Edge i joins corner i and i+1;
// EDGE_DIRS[i] is the axial offset of the neighbour across that edge.
export const EDGE_DIRS = [[0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0]];

export const hexKey = (q, r) => `${q},${r}`;
