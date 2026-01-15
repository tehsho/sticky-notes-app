namespace StickyNotesApi.Models;

public class NotePatchDto
{
    public double? X { get; set; }
    public double? Y { get; set; }
    public double? W { get; set; }
    public double? H { get; set; }
    public string? Text { get; set; }
    public NoteColor? Color { get; set; }
    public int? Z { get; set; }
}
