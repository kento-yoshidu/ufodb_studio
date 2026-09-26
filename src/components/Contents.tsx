import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import Header from "./Headet";
import SidePanel from "./SidePanel";
import styles from "./cotents.module.css";

export default function Contents() {
  const [key, setKey] = useState("");

  const [keyA, setKeyA] = useState("");
  const [keyB, setKeyB] = useState("");

  async function insert() {
    const res = await invoke("make_set", { key });

    setGroups(await invoke<string[][]>("groups"));
  }

  const handleMerge = async () => {
    const res = await invoke("unite", {
      keyA,
      keyB,
    });

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
          keyValue={key}
          setKey={setKey}
          keyA={keyA}
          setKeyA={setKeyA}
          keyB={keyB}
          setKeyB={setKeyB}
          insert={insert}
          handleMerge={handleMerge}
        />

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
