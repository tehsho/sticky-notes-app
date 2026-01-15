import { Note, NoteCreate, NotePatch, NoteColor } from "../types";

type ApiNoteColor = "Yellow" | "Pink" | "Blue" | "Green";

type ApiNote = Omit<Note, "color"> & { color: ApiNoteColor };
type ApiNoteCreate = Omit<NoteCreate, "color"> & { color: ApiNoteColor };
type ApiNotePatch = Partial<ApiNoteCreate>;

const API_BASE = "https://localhost:5001/api/notes";

const toApiColor = (c: NoteColor): ApiNoteColor => {
  switch (c) {
    case "yellow":
      return "Yellow";
    case "pink":
      return "Pink";
    case "blue":
      return "Blue";
    case "green":
      return "Green";
  }
};

const fromApiColor = (c: ApiNoteColor): NoteColor => {
  switch (c) {
    case "Yellow":
      return "yellow";
    case "Pink":
      return "pink";
    case "Blue":
      return "blue";
    case "Green":
      return "green";
  }
};

const toUiNote = (n: ApiNote): Note => ({ ...n, color: fromApiColor(n.color) });

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  // Sometimes APIs return 200 with empty body
  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }

  return JSON.parse(text) as T;
}

export const NotesApi = {
  async getNotes(): Promise<Note[]> {
    const apiNotes = await request<ApiNote[]>(API_BASE);
    return apiNotes.map(toUiNote);
  },

  async createNote(dto: NoteCreate): Promise<Note> {
    const payload = {
      ...dto,
      color: toApiColor(dto.color), // "yellow" -> "Yellow"
    };

    const created = await request<ApiNote>(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return toUiNote(created); // "Yellow" -> "yellow"
  },

  async updateNote(id: string, patch: NotePatch): Promise<Note> {
    const { color, ...rest } = patch;

    const payload: ApiNotePatch = {
      ...rest,
      ...(color ? { color: toApiColor(color) } : {}),
    };

    // Backend uses int? -> make sure we send integers (no decimals / NaN)
    const roundIfNumber = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;

    if (payload.x !== undefined) payload.x = roundIfNumber(payload.x) as any;
    if (payload.y !== undefined) payload.y = roundIfNumber(payload.y) as any;
    if (payload.w !== undefined) payload.w = roundIfNumber(payload.w) as any;
    if (payload.h !== undefined) payload.h = roundIfNumber(payload.h) as any;
    if (payload.z !== undefined) payload.z = roundIfNumber(payload.z) as any;

    // Remove any fields that became undefined (avoids weird JSON)
    (Object.keys(payload) as (keyof ApiNotePatch)[]).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    const updated = await request<ApiNote>(`${API_BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return toUiNote(updated);
  },
  async deleteNote(id: string): Promise<void> {
    await request<void>(`${API_BASE}/${id}`, { method: "DELETE" });
  },
};
