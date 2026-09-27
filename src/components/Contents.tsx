import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import styles from "./cotents.module.css";
import { Header, InsertKeyForm, MergeForm, SidePanel } from "ufodb-design-system";

export default function Contents() {
  async function handleInsertKey(key: string) {
    const res = await invoke("make_set", { key });

    console.log("insert res = ", res);

    setGroups(await invoke<string[][]>("groups"));
  }

  const handleMerge = async (keyA: string, keyB: string) => {
    const res = await invoke("unite", {
      keyA,
      keyB,
    });

    console.log("merge res = ", res);

    setGroups(await invoke<string[][]>("groups"));
  };

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
            onSubmit={handleMerge}
          />
        </SidePanel>

        <div className="main">
          <section className="panel">
            {groups.length === 0 ? (
              <p className="groups__empty">まだグループがありません</p>
            ) : (
              <ul className="groups">
                {groups.map((group, i) => (
                  <li key={i} className="groups__item">{group.join(", ")}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
