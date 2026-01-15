import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { NotesApi } from "./api/notesApi";
import { Note } from "./types";

jest.mock("./api/notesApi", () => ({
  NotesApi: {
    getNotes: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  },
}));

const api = NotesApi as jest.Mocked<typeof NotesApi>;

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: overrides.id ?? "n1",
  x: overrides.x ?? 10,
  y: overrides.y ?? 10,
  w: overrides.w ?? 200,
  h: overrides.h ?? 160,
  text: overrides.text ?? "",
  color: overrides.color ?? "yellow",
  z: overrides.z ?? 1,
});

beforeEach(() => {
  api.getNotes.mockResolvedValue([]);
  api.createNote.mockImplementation(async (dto: any) => ({
    id: "server-1",
    ...dto,
  }));
  api.updateNote.mockImplementation(async (_id: string, patch: any) => patch);
  api.deleteNote.mockResolvedValue(undefined as any);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe("Sticky Notes App", () => {
  test("loads notes from API on mount", async () => {
    api.getNotes.mockResolvedValueOnce([
      makeNote({ id: "a1", text: "Hello", color: "pink" }),
    ]);

    render(<App />);

    // textarea value comes from note.text
    expect(await screen.findByDisplayValue("Hello")).toBeInTheDocument();

    // badge renders color string
    expect(screen.getByText("pink")).toBeInTheDocument();

    expect(api.getNotes).toHaveBeenCalledTimes(1);
  });

  test("clicking + New note calls API createNote", async () => {
    render(<App />);

    // wait until the canvas exists so canvasRef.current is set
    await waitFor(() => expect(document.querySelector(".canvas")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /\+ New note/i }));

    await waitFor(() => expect(api.createNote).toHaveBeenCalledTimes(1));

    // optimistic note renders a textarea
    expect(
      await screen.findByPlaceholderText(/Type your note/i),
    ).toBeInTheDocument();
  });

  test("typing triggers debounced updateNote", async () => {
    jest.useFakeTimers();

    api.getNotes.mockResolvedValueOnce([makeNote({ id: "u1", text: "" })]);

    render(<App />);

    const textarea = await screen.findByPlaceholderText(/Type your note/i);

    fireEvent.change(textarea, { target: { value: "A" } });
    fireEvent.change(textarea, { target: { value: "AB" } });

    expect(api.updateNote).toHaveBeenCalledTimes(0);

    // Your debounce is 250ms
    jest.advanceTimersByTime(260);

    await waitFor(() => expect(api.updateNote).toHaveBeenCalledTimes(1));

    const [, patch] = api.updateNote.mock.calls[0];
    expect(patch).toMatchObject({ text: "AB" });
  });
});
