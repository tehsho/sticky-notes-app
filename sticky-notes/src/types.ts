export type NoteColor = "yellow" | "pink" | "blue" | "green";

export type Note = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: NoteColor; // lowercase in UI
  z: number;
};

export type NoteCreate = Omit<Note, "id">;
export type NotePatch = Partial<NoteCreate>;
