import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  Graph,
  Groups,
  Header,
  InsertKeyForm,
  MenuPanel,
  MergeForm,
  type Action,
  type Mode,
} from "ufodb-design-system";
import styles from "./cotents.module.css";
import SameForm from "./SameForm";
import { GraphData } from "../type";

export default function Contents() {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("row");
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    edges: [],
  });

  async function handleInsertKey(key: string) {
    const res = await invoke("make_set", { key });

    await refresh();
  }

  const handleMerge = async (keyA: string, keyB: string) => {
    const res = await invoke("unite", {
      keyA,
      keyB,
    });

    await refresh();
  };

  const handleSame = async (keyA: string, keyB: string) => {
    const res = await invoke<boolean>("same", {
      keyA,
      keyB,
    });

    setSameResult(res ? "同じグループです" : "違うグループです");
  }

  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [sameResult, setSameResult] = useState<string | null>(null);

  const selectAction = (action: Action | null) => {
    setActiveAction(action);
    setSameResult(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsMenuOpen((open) => !open);
      }

      if (e.key === "Escape") {
        setActiveAction(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["ufdb", "groups"],
    queryFn: () => invoke<string[][]>("groups"),
  });

  useEffect(() => {
    invoke<GraphData>("graph").then(setGraphData);
  }, []);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["ufdb", "groups"] });
    setGraphData(await invoke<GraphData>("graph"));
  };

  return (
    <div className={styles.wrapper}>
      <Header
        isSidebarOpen={isMenuOpen}
        onToggleSidebar={() => setIsMenuOpen((open) => !open)}
      />

      {isLoadingGroups && (
        <p>loading...</p>
      )}

      <main className={styles.main}>
        <div className={styles.right}>
          {mode === "row" ? (
            groups.length === 0 ? (
              <p>まだグループがありません</p>
            ) : (
              <Groups groups={groups} />
            )
          ) : (
            <Graph graph={graphData} />
          )}
        </div>
      </main>

      {isMenuOpen && (
        <MenuPanel
          active={activeAction}
          onSelect={selectAction}
          mode={mode}
          onChangeMode={setMode}
        >
          {activeAction === "insert" && (
            <InsertKeyForm
              onSubmit={handleInsertKey}
            />
          )}

          {activeAction === "merge" && (
            <MergeForm
              options={groups}
              onSubmit={handleMerge}
            />
          )}

          {activeAction === "same" && (
            <>
              <SameForm
                onSubmit={handleSame}
              />

              {sameResult && <p>{sameResult}</p>}
            </>
          )}
        </MenuPanel>
      )}
    </div>
  );
}
