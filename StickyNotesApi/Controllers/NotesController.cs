using Microsoft.AspNetCore.Mvc;
using StickyNotesApi.Models;
using StickyNotesApi.Repositories;

namespace StickyNotesApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotesController : ControllerBase
{
    private readonly NotesRepository _repo;

    public NotesController(NotesRepository repo)
    {
        _repo = repo;
    }

    [HttpGet]
    public ActionResult<IEnumerable<NoteDto>> GetAll()
        => Ok(_repo.GetAll());

    [HttpPost]
    public ActionResult<NoteDto> Create([FromBody] NoteCreateDto dto)
    {
        var created = _repo.Create(dto);
        return Ok(created);
    }

    [HttpGet("{id}")]
    public ActionResult<NoteDto> GetById(string id)
    {
        if (!_repo.TryGet(id, out var note))
            return NotFound();

        return Ok(note);
    }

    [HttpPatch("{id}")]
    public ActionResult<NoteDto> Patch(string id, [FromBody] NotePatchDto patch)
    {
        try
        {
            var updated = _repo.Update(id, patch);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(string id)
    {
        var removed = _repo.TryDelete(id);
        return removed ? NoContent() : NotFound();
    }
}
