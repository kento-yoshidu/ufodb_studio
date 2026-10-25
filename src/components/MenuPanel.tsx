import type { ReactNode } from "react";
import styles from "./menuPanel.module.css";

export type Action = "insert" | "merge" | "same";
export type Mode = "row" | "graph";

type Props = {
  active: Action | null;
  onSelect: (action: Action | null) => void;
  mode: Mode;
  onChangeMode: (mode: Mode) => void;
  children?: ReactNode;
};

const actions: { id: Action; icon: string; label: string }[] = [
  { id: "insert", icon: "+", label: "Insert" },
  { id: "merge", icon: "⇄", label: "Merge" },
  { id: "same", icon: "=", label: "Same" },
];

const modes: Mode[] = ["row", "graph"];

export default function MenuPanel({
  active,
  onSelect,
  mode,
  onChangeMode,
  children,
}: Props) {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.menu}>
        <ul className={styles.actions}>
          {actions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                className={`${styles.item} ${active === action.id ? styles.active : ""}`}
                aria-pressed={active === action.id}
                onClick={() => onSelect(active === action.id ? null : action.id)}
              >
                <span className={styles.icon}>{action.icon}</span>
                {action.label}
              </button>
            </li>
          ))}
        </ul>

        <hr className={styles.divider} />

        <div className={styles.toggle} role="group" aria-label="表示の切り替え">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.segment} ${mode === m ? styles.selected : ""}`}
              aria-pressed={mode === m}
              onClick={() => onChangeMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </nav>

      {active && (
        <section className={styles.popover}>
          <button
            type="button"
            className={styles.close}
            aria-label="閉じる"
            onClick={() => onSelect(null)}
          >
            ×
          </button>

          {children}
        </section>
      )}
    </div>
  );
}
