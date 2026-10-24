import { GraphData } from "../type";

const GAP_X = 80;
const GAP_Y = 120;
const GROUP_GAP = 20

export type Placed = {
  key: string;
  x: number;
  y: number;
  group: string[];
};

export function layoutForest(graph: GraphData): Placed[] {
  // 辺の一覧から、キー → 隣のキー の表を作り直す（両方向）
  const adj = new Map<string, string[]>();

  for (const key of graph.nodes) {
    adj.set(key, []);
  }

  for (const { source, target } of graph.edges) {
    adj.get(source)!.push(target);
    adj.get(target)!.push(source);
  }

  const visited = new Set<string>();
  const result: Placed[] = [];

  let offsetX = 0;

  // nodesはソート済みなので、まだ訪れていない最初のキー = そのグループの最小キー
  for (const root of graph.nodes) {
    if (visited.has(root)) continue;

    // BFSで段ごとに分ける
    const levels: string[][] = [];
    let current = [root];

    visited.add(root);

    while (current.length > 0) {
      levels.push(current);

      const next: string[] = [];

      for (const key of current) {
        for (const neighbor of adj.get(key)!) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            next.push(neighbor);
          }
        }
      }

      current = next;
    }

    const group = levels.flat();
    // いちばん横に長い段をこのグループの幅にする
    const width = Math.max(...levels.map((level) => level.length)) * GAP_X;

    levels.forEach((level, depth) => {
      // 段ごとに中央寄せ
      const levelWidth = level.length * GAP_X;

      level.forEach((key, i) => {
        result.push({
          key,
          x: offsetX + (width - levelWidth) / 2 + i * GAP_X,
          y: depth * GAP_Y,
          group,
        });
      });
    });

    offsetX += width + GROUP_GAP;
  }

  return result;
}
