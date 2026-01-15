using Microsoft.AspNetCore.Mvc;
using StickyNotesApi.Controllers;
using StickyNotesApi.Models;
using StickyNotesApi.Repositories;

namespace StickyNotesApi.Tests;

public class NotesControllerTests
{
    private static NotesController CreateController(out NotesRepository repo)
    {
        repo = new NotesRepository();
        return new NotesController(repo);
    }

    [Fact]
    public void GetAll_ReturnsOk_WithEnumerable()
    {
        var controller = CreateController(out _);

        var result = controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);

        var notes = Assert.IsAssignableFrom<IEnumerable<NoteDto>>(ok.Value);

        Assert.NotNull(notes);
    }

    [Fact]
    public void Create_ReturnsOk_WithCreatedNote()
    {
        var controller = CreateController(out _);

        var dto = new NoteCreateDto
        {
            X = 10,
            Y = 20,
            W = 200,
            H = 150,
            Text = "hello",
            Color = NoteColor.Yellow,
            Z = 1
        };

        var result = controller.Create(dto);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var created = Assert.IsType<NoteDto>(ok.Value);

        Assert.False(string.IsNullOrWhiteSpace(created.Id));
        Assert.Equal(10, created.X);
        Assert.Equal(20, created.Y);
        Assert.Equal(200, created.W);
        Assert.Equal(150, created.H);
        Assert.Equal("hello", created.Text);
        Assert.Equal(NoteColor.Yellow, created.Color);
        Assert.Equal(1, created.Z);
    }

    [Fact]
    public void GetById_WhenMissing_ReturnsNotFound()
    {
        var controller = CreateController(out _);

        var result = controller.GetById("missing");

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public void Patch_WhenMissing_ReturnsNotFound()
    {
        var controller = CreateController(out _);

        var patch = new NotePatchDto { Text = "x" };

        var result = controller.Patch("missing", patch);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public void Delete_WhenMissing_ReturnsNotFound()
    {
        var controller = CreateController(out _);

        var result = controller.Delete("missing");

        Assert.IsType<NotFoundResult>(result);
    }
}
