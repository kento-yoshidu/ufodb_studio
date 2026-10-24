import "@xyflow/react/dist/style.css";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { GraphData } from "../type";
import { layoutForest } from "./LayoutForest";
import { groupColor } from "ufodb-design-system";
import { CSSProperties } from "react";
import styles from "./graph.module.css";

type Props = {
  graph: GraphData;
};

export default function Graph({
  graph,
}: Props) {
  const placed = layoutForest(graph);

  const colorOf = new Map(
    placed.map((p) => [p.key, groupColor(p.group)]),
  );

  const nodes: Node[] = layoutForest(graph).map((placed) => ({
    id: placed.key,
    position: { x: placed.x, y: placed.y },
    data: { label: placed.key },
    className: styles.node,
    style: { "--group-color": colorOf.get(placed.key) } as CSSProperties,
  }));

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: `${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    className: styles.edge,
    type: "straight",
    style: { stroke: colorOf.get(edge.source) },
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
