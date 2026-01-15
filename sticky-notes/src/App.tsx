import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Note, NoteColor, NoteCreate } from "./types";
import { NotesApi } from "./api/notesApi";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const genId = () => Math.random().toString(36).slice(2, 10);

function colorToHex(c: NoteColor) {
  switch (c) {
    case "yellow":
      return "#fff3a3";
    case "pink":
      return "#ffd1dc";
    case "blue":
      return "#cfe8ff";
    case "green":
      return "#d6ffd6";
  }
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const trashRef = useRef<HTMLDivElement | null>(null);

  // API is source of truth
  const [notes, setNotes] = useState<Note[]>([]);
  const [newW, setNewW] = useState(220);
  const [newH, setNewH] = useState(180);
  const [newColor, setNewColor] = useState<NoteColor>("yellow");

  const maxZ = useMemo(
    () => notes.reduce((m, n) => Math.max(m, n.z), 0),
    [notes],
  );
  const [trashActive, setTrashActive] = useState(false);
  const notesRef = useRef<Note[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Load notes from API on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await NotesApi.getNotes();
        if (!cancelled) setNotes(Array.isArray(remote) ? remote : []);
      } catch (err) {
        console.error("API getNotes failed:", err);
        if (!cancelled) setNotes([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced per-note PATCH calls
  const patchTimersRef = useRef<Record<string, number>>({});

  const schedulePatch = (id: string, patch: Partial<Note>) => {
    const timers = patchTimersRef.current;

    if (timers[id]) window.clearTimeout(timers[id]);

    timers[id] = window.setTimeout(async () => {
      try {
        // send only changed fields
        const saved = await NotesApi.updateNote(id, patch);

        // reconcile with server response
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, ...saved } : n)),
        );
      } catch (err) {
        console.error("API updateNote failed:", err);
      } finally {
        delete timers[id];
      }
    }, 250);
  };

  const createNote = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const offset = (notes.length % 8) * 18;

    const tempId = `tmp_${genId()}`;

    const optimistic: Note = {
      id: tempId,
      x: 24 + offset,
      y: 24 + offset,
      w: clamp(newW, 140, 420),
      h: clamp(newH, 120, 420),
      text: "",
      color: newColor,
      z: maxZ + 1,
    };

    setNotes((prev) => [...prev, optimistic]);

    try {
      const payload: NoteCreate = {
        x: optimistic.x,
        y: optimistic.y,
        w: optimistic.w,
        h: optimistic.h,
        text: optimistic.text,
        color: optimistic.color,
        z: optimistic.z,
      };
      const created = await NotesApi.createNote(payload); // server returns Note with real id

      setNotes((prev) => prev.map((n) => (n.id === tempId ? created : n)));
    } catch (err) {
      console.error("API createNote failed:", err);
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
    }
  };

  const bringToFront = (id: string) => {
    setNotes((prev) => {
      const nextZ = prev.reduce((m, n) => Math.max(m, n.z), 0) + 1;
      const updated = prev.map((n) => (n.id === id ? { ...n, z: nextZ } : n));

      // don't persist z if currently dragging this note
      if (!dragState.current || dragState.current.id !== id) {
        schedulePatch(id, { z: nextZ });
      }

      return updated;
    });
  };

  const updateNote = (id: string, patch: Partial<Note>) => {
    // update UI immediately
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    // persist to API (debounced)
    schedulePatch(id, patch);
  };

  const deleteNote = async (id: string) => {
    // cancel pending PATCH timer for this note
    const t = patchTimersRef.current[id];
    if (t) {
      window.clearTimeout(t);
      delete patchTimersRef.current[id];
    }

    const snapshot = notesRef.current; // use ref, not stale closure
    setNotes((prev) => prev.filter((n) => n.id !== id));

    // if it's a temp note, don't call API
    if (id.startsWith("tmp_")) return;

    try {
      await NotesApi.deleteNote(id);
    } catch (err) {
      console.error("API deleteNote failed:", err);
      setNotes(snapshot); // rollback
    }
  };

  // Dragging state
  const dragState = useRef<null | {
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>(null);

  const onPointerMove = (e: PointerEvent) => {
    const st = dragState.current;
    if (!st) return;

    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;

    setNotes((prev) => {
      const canvas = canvasRef.current;
      if (!canvas) return prev;

      const rect = canvas.getBoundingClientRect();

      return prev.map((n) => {
        if (n.id !== st.id) return n;

        if (st.mode === "move") {
          const newX = clamp(st.origX + dx, 0, rect.width - n.w);
          const newY = clamp(st.origY + dy, 0, rect.height - n.h);
          return { ...n, x: newX, y: newY };
        } else {
          const minW = 140;
          const minH = 120;
          const newW = clamp(st.origW + dx, minW, rect.width - n.x);
          const newH = clamp(st.origH + dy, minH, rect.height - n.y);
          return { ...n, w: newW, h: newH };
        }
      });
    });
    setTrashActive(st.mode === "move" && isOverTrash(e.clientX, e.clientY));
  };

  const isOverTrash = (x: number, y: number) => {
    const trash = trashRef.current;
    if (!trash) return false;
    const r = trash.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const onPointerUp = (e: PointerEvent) => {
    const st = dragState.current;
    if (!st) return;

    const overTrashNow =
      st.mode === "move" && isOverTrash(e.clientX, e.clientY);
    const note = notesRef.current.find((n) => n.id === st.id);

    if (overTrashNow) {
      deleteNote(st.id);
    } else if (note) {
      if (st.mode === "move") schedulePatch(note.id, { x: note.x, y: note.y });
      if (st.mode === "resize")
        schedulePatch(note.id, { w: note.w, h: note.h });
    }

    setTrashActive(false);
    dragState.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  const startMove = (id: string, e: React.PointerEvent) => {
    e.preventDefault();

    const note = notesRef.current.find((n) => n.id === id);
    if (!note) return;

    bringToFront(id);

    dragState.current = {
      id,
      mode: "move",
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y,
      origW: note.w,
      origH: note.h,
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const startResize = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const note = notesRef.current.find((n) => n.id === id);
    if (!note) return;

    bringToFront(id);

    dragState.current = {
      id,
      mode: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y,
      origW: note.w,
      origH: note.h,
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="app">
      <header className="toolbar">
        <div className="title">Sticky Notes</div>

        <div className="controls">
          <label>
            W
            <input
              type="number"
              value={newW}
              min={140}
              max={420}
              onChange={(e) => setNewW(Number(e.target.value))}
            />
          </label>

          <label>
            H
            <input
              type="number"
              value={newH}
              min={120}
              max={420}
              onChange={(e) => setNewH(Number(e.target.value))}
            />
          </label>

          <label>
            Color
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value as NoteColor)}
            >
              <option value="yellow">Yellow</option>
              <option value="pink">Pink</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
            </select>
          </label>

          <button className="primary" onClick={createNote}>
            + New note
          </button>
        </div>

        <div className="hint">
          Drag header to move • Drag corner to resize • Drop on trash to delete
        </div>
      </header>

      <main className="canvas" ref={canvasRef}>
        {notes.map((n) => (
          <div
            key={n.id}
            className="note"
            style={{
              left: n.x,
              top: n.y,
              width: n.w,
              height: n.h,
              background: colorToHex(n.color),
              zIndex: n.z,
            }}
            onPointerDown={() => bringToFront(n.id)}
          >
            <div
              className="noteHeader"
              onPointerDown={(e) => startMove(n.id, e)}
            >
              <span className="noteBadge">{n.color}</span>
            </div>

            <textarea
              className="noteBody"
              value={n.text}
              placeholder="Type your note…"
              onChange={(e) => updateNote(n.id, { text: e.target.value })}
              onFocus={() => bringToFront(n.id)}
            />

            <div
              className="resizeHandle"
              onPointerDown={(e) => startResize(n.id, e)}
              title="Resize"
            />
          </div>
        ))}

        <div
          className={`trash ${trashActive ? "active" : ""}`}
          ref={trashRef}
          title="Drop here to delete"
        >
          🗑 Trash
        </div>
      </main>
    </div>
  );
}
