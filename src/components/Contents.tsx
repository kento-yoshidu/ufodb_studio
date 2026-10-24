import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Groups, Header, InsertKeyForm, MergeForm, SidePanel } from "ufodb-design-system";
import styles from "./cotents.module.css";
import SameForm from "./SameForm";

type GraphData = {
  nodes: string[];
  edges: {
    source: string;
    target: string;
  }[];
};

export default function Contents() {
  const [mode, setMode] = useState<"row" | "graph">("row");

  async function handleInsertKey(key: string) {
    const res = await invoke("make_set", { key });

    setGroups(await invoke<string[][]>("groups"));
  }

  const graph = async () => {
    const res = await invoke<GraphData>("graph");

    console.log("res = ", res);
  };

  const handleMerge = async (keyA: string, keyB: string) => {
    const res = await invoke("unite", {
      keyA,
      keyB,
    });

    setGroups(await invoke<string[][]>("groups"));
  };

  const handleSame = async (keyA: string, keyB: string) => {
    const res = await invoke("same", {
      keyA,
      keyB,
    });

    window.alert(res);
  }

  const [groups, setGroups] = useState<string[][]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    invoke<string[][]>("groups").then(setGroups);
    graph();
  }, []);

  return (
    <div className={styles.wrapper}>
      <Header
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      <main className={styles.main}>
        <SidePanel
          isOpen={isSidebarOpen}
        >
          <InsertKeyForm
            onSubmit={handleInsertKey}
          />

          <MergeForm
            options={groups}
            onSubmit={handleMerge}
          />

          <SameForm
            onSubmit={handleSame}
          />
        </SidePanel>

        {mode === "row" ? (
          <div className={styles.right}>
            <>
              {groups.length === 0 ? (
                <p className="groups__empty">まだグループがありません</p>
              ) : (
                <Groups groups={groups} />
              )}
            </>
          </div>
          ) : (
            <p>graph</p>
          )}
      </main>
    </div>
  );
}
