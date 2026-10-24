import "@xyflow/react/dist/style.css";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { GraphData } from "../type";
import styles from "./graph.module.css";

type Props = {
  graph: GraphData;
};

export default function Graph({
  graph,
}: Props) {
  // 仮の配置: 10個ずつ横に並べて折り返す
  const nodes: Node[] = graph.nodes.map((key, i) => ({
    id: key,
    position: { x: (i % 10) * 120, y: Math.floor(i / 10) * 100 },
    data: { label: key },
    className: styles.node,
  }));

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    className: styles.edge,
  }));

  return (
    <div className={styles.wrapper}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
