using System.Collections.Concurrent;
using StickyNotesApi.Models;

namespace StickyNotesApi.Repositories;

public class NotesRepository
{
    private readonly ConcurrentDictionary<string, NoteDto> _notes = new();

    public IReadOnlyCollection<NoteDto> GetAll()
        => _notes.Values.OrderBy(n => n.Z).ToList();

    public NoteDto Create(NoteCreateDto dto)
    {
        var note = new NoteDto
        {
            Id = Guid.NewGuid().ToString("N"),
            X = dto.X,
            Y = dto.Y,
            W = dto.W,
            H = dto.H,
            Text = dto.Text ?? "",
            Color = dto.Color,
            Z = dto.Z
        };

        _notes[note.Id] = note;
        return note;
    }

    public bool TryGet(string id, out NoteDto note) => _notes.TryGetValue(id, out note!);

    public bool TryDelete(string id) => _notes.TryRemove(id, out _);

    public NoteDto Update(string id, NotePatchDto patch)
    {
        if (!_notes.TryGetValue(id, out var existing))
            throw new KeyNotFoundException($"Note {id} not found");

        if (patch.X.HasValue) existing.X = patch.X.Value;
        if (patch.Y.HasValue) existing.Y = patch.Y.Value;
        if (patch.W.HasValue) existing.W = patch.W.Value;
        if (patch.H.HasValue) existing.H = patch.H.Value;

        if (patch.Text is not null) existing.Text = patch.Text;

        if (patch.Color.HasValue) existing.Color = patch.Color.Value;

        if (patch.Z.HasValue) existing.Z = patch.Z.Value;

        _notes[id] = existing;
        return existing;
    }

}
