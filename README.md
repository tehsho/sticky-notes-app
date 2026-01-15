# Sticky Notes Application

A simple **Sticky Notes** web application built with **ASP.NET Core Web API** and **React**.  
Users can create, move, resize, edit, and delete sticky notes on a canvas.  
All notes are persisted via a REST API.

---

## Tech Stack

### Backend
- ASP.NET Core 9.0
- C#
- RESTful API
- In-memory repository
- xUnit (unit testing)

### Frontend
- React
- TypeScript
- Plain CSS
- Fetch-based API client

---

## Features

- Create new sticky notes
- Drag notes to move them
- Resize notes
- Edit note text
- Change note color
- Automatic z-index handling
- Drag note to trash to delete
- Optimistic UI updates
- Debounced API updates

---

## Project Structure

### Backend

StickyNotesApi/
├── Controllers/
│ └── NotesController.cs
├── Models/
│ ├── NoteDto.cs
│ ├── NoteCreateDto.cs
│ ├── NotePatchDto.cs
│ └── NoteColor.cs
├── Repositories/
│ └── NotesRepository.cs
├── Program.cs
├── StickyNotesApi.csproj
├── StickyNotesApi.sln
StickyNotesApi.Tests/
├── NotesControllerTests.cs
├── StickyNotesApi.Tests.csproj


### Frontend

sticky-notes/
├── src/
│ ├── App.tsx
│ ├── App.test.tsx
│ ├── api/
│ │ └── notesApi.ts
│ ├── types.ts
│ └── App.css


---

## Architecture Description

The application follows a **client–server architecture**.

The **React frontend** is responsible for rendering the user interface and handling interactions such as dragging, resizing, editing, and deleting notes.  
It applies **optimistic updates**, updating the UI immediately while synchronizing changes with the backend. Updates are **debounced** to reduce unnecessary network calls.

The **ASP.NET Core Web API backend** exposes REST endpoints to manage notes (`GET`, `POST`, `PATCH`, `DELETE`).  
Business logic is minimal and delegated to a **repository layer**, which currently stores notes in memory using a thread-safe collection.

The use of **DTOs** clearly separates API contracts from internal models and makes the system easy to extend (e.g., replacing the in-memory store with a database).

---

## API Endpoints

| Method | Endpoint            | Description             |
|------|---------------------|-------------------------|
| GET  | `/api/notes`        | Get all notes           |
| GET  | `/api/notes/{id}`   | Get note by ID          |
| POST | `/api/notes`        | Create a new note       |
| PATCH| `/api/notes/{id}`   | Update a note partially |
| DELETE | `/api/notes/{id}` | Delete a note           |

---

## Running the Backend

cd StickyNotesApi
dotnet restore
dotnet run


API will be available at:
https://localhost:5001

Swagger UI:
https://localhost:5001/swagger

Running Unit Tests
dotnet test

Running the Frontend
http://localhost:3000

Notes:

The backend uses in-memory storage for simplicity.

Data is reset when the API restarts.

The architecture is intentionally simple and extensible.