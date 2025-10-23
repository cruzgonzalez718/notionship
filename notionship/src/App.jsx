import React, { useEffect, useMemo, useRef, useState } from "react";

// --------- Basics ----------
const STORAGE_KEY = "notionship_todos_v1";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const MAX_LEVEL = 8;

export default function App() {
  // ---------- State ----------
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [{ id: uid(), text: "", checked: false, level: 0 }];
  });
  const [hideDone, setHideDone] = useState(false);

  // Keep refs to inputs for smart focusing
  const inputsRef = useRef({});
  const setInputRef = (id) => (el) => {
    if (el) inputsRef.current[id] = el;
  };

  // ---------- Persistence (Local) ----------
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // ---------- CRUD helpers ----------
  const setText = (id, text) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, text } : x)));

  const setChecked = (id, checked) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, checked } : x)));

  const insertAfter = (index, item) =>
    setItems((xs) => {
      const c = xs.slice();
      c.splice(index + 1, 0, item);
      return c;
    });

  const removeAt = (index) =>
    setItems((xs) => {
      if (xs.length === 1) return xs; // always keep one line
      const c = xs.slice();
      c.splice(index, 1);
      return c;
    });

  const swap = (i, j) =>
    setItems((xs) => {
      if (i < 0 || j < 0 || i >= xs.length || j >= xs.length) return xs;
      const c = xs.slice();
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const safeIndent = (index, dir) =>
    setItems((xs) => {
      const here = xs[index];
      const prev = xs[index - 1];
      if (!here) return xs;
      const prevCap = prev ? prev.level + 1 : 0;
      const target =
        dir === "in"
          ? clamp(here.level + 1, 0, Math.min(prevCap, MAX_LEVEL))
          : clamp(here.level - 1, 0, MAX_LEVEL);
      if (target === here.level) return xs;
      const c = xs.slice();
      c[index] = { ...here, level: target };
      return c;
    });

  // ---------- Keyboard behavior ----------
  const onKeyDown = (e, index, item) => {
    // Enter → new row below (same level)
    if (e.key === "Enter") {
      e.preventDefault();
      const newRow = { id: uid(), text: "", checked: false, level: item.level };
      insertAfter(index, newRow);
      requestAnimationFrame(() => inputsRef.current[newRow.id]?.focus());
      return;
    }
    // Tab / Shift+Tab → indent / outdent
    if (e.key === "Tab") {
      e.preventDefault();
      e.shiftKey ? safeIndent(index, "out") : safeIndent(index, "in");
      return;
    }
    // Backspace on empty → delete and focus previous
    if (e.key === "Backspace" && item.text === "") {
      e.preventDefault();
      const prevId = items[index - 1]?.id;
      removeAt(index);
      requestAnimationFrame(() => prevId && inputsRef.current[prevId]?.focus());
      return;
    }
    // Alt+↑/↓ → move row
    if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      swap(index, e.key === "ArrowUp" ? index - 1 : index + 1);
      requestAnimationFrame(() => inputsRef.current[item.id]?.focus());
      return;
    }
  };

  // ---------- Derived view ----------
  const visible = useMemo(
    () => (hideDone ? items.filter((x) => !x.checked) : items),
    [items, hideDone]
  );

  return (
    <div style={S.shell}>
      {/* Top bar */}
      <div style={S.header}>
        <h1 style={S.h1}>Tasks</h1>
        <div style={S.tools}>
          <button style={S.btn} onClick={() => setHideDone((v) => !v)}>
            {hideDone ? "Show completed" : "Hide completed"}
          </button>
          <button
            style={S.primary}
            onClick={() =>
              setItems([{ id: uid(), text: "", checked: false, level: 0 }])
            }
          >
            Clear
          </button>
        </div>
      </div>

      {/* List */}
      <div style={S.list}>
        {visible.map((item) => {
          const idx = items.findIndex((x) => x.id === item.id);
          return (
            <div
              key={item.id}
              style={{ ...S.row, paddingLeft: 12 + item.level * 24 }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => setChecked(item.id, e.target.checked)}
                style={S.checkbox}
                aria-label="Done"
              />
              <input
                ref={setInputRef(item.id)}
                value={item.text}
                onChange={(e) => setText(item.id, e.target.value)}
                onKeyDown={(e) => onKeyDown(e, idx, item)}
                placeholder="Type…  (Enter new • Tab indent • Alt+↑/↓ move)"
                style={{
                  ...S.input,
                  textDecoration: item.checked ? "line-through" : "none",
                  opacity: item.checked ? 0.6 : 1,
                }}
              />
              <div style={S.icons}>
                <button style={S.iconBtn} onClick={() => safeIndent(idx, "out")}>
                  ◦
                </button>
                <button style={S.iconBtn} onClick={() => safeIndent(idx, "in")}>
                  •
                </button>
                <button style={S.iconBtn} onClick={() => removeAt(idx)}>
                  ⌫
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <button
          style={S.primary}
          onClick={() =>
            insertAfter(items.length - 1, {
              id: uid(),
              text: "",
              checked: false,
              level: 0,
            })
          }
        >
          + New task
        </button>
        <small style={{ marginLeft: 12, opacity: 0.7 }}>
          Shortcuts: Enter • Tab/Shift+Tab • Alt+↑/↓ • Backspace on empty
        </small>
      </div>
    </div>
  );
}

// --------- Inline styles ----------
const S = {
  shell: {
    maxWidth: 760,
    margin: "40px auto",
    padding: "0 16px 40px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  h1: { fontSize: 28, margin: 0 },
  tools: { display: "flex", gap: 8 },
  btn: {
    border: "1px solid #ddd",
    background: "#fafafa",
    padding: "6px 10px",
    borderRadius: 8,
    cursor: "pointer",
  },
  primary: {
    border: "1px solid #0d6efd",
    background: "#0d6efd",
    color: "white",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 4 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: "6px 8px",
    border: "1px solid #eee",
    background: "white",
  },
  checkbox: { width: 18, height: 18 },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 16,
    background: "transparent",
    padding: "6px 8px",
  },
  icons: { display: "flex", gap: 4 },
  iconBtn: {
    border: "1px solid #eee",
    background: "#f7f7f7",
    padding: "2px 6px",
    borderRadius: 6,
    cursor: "pointer",
  },
  footer: { marginTop: 16, display: "flex", alignItems: "center" },
};
