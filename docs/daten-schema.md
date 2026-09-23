# StitchTexTech — Daten-Schema

Aus `AGENTS.md` ausgelagert am 2026-09-23.

## Daten-Schema (timeline.js) — verbindlich

### Event-Objekt

```js
{
  "id": "kebab-case-REQUIRED",          // z.B. "singer-1851", "reprap-2007"
  "year": 1851,
  "month": null,                         // optional, 1–12
  "track": "A",                          // A | B | C | D | E | F | G
  "title": "Kurzer Titel (≤60 Zeichen)",
  "subtitle": "Ergänzender Untertitel",  // optional
  "description": "2–4 Sätze auf Deutsch. Sachlich, bildungsgerecht.",
  "significance": "low|medium|high|landmark",

  // ── Medien ──────────────────────────────────────────────────
  // Bevorzugt: neues media[]-Array (Panel v2)
  "media": [
    {
      "type": "image",                   // image | video | embed | screenshot
      "url": "https://...",
      "caption": "Bildbeschreibung",
      "license": "CC BY-SA 3.0",
      "author": "Name des Urhebers",
      "source": "Wikimedia Commons"
    },
    {
      "type": "video",
      "url": "https://www.youtube-nocookie.com/embed/VIDEO_ID",
      "caption": "Videobeschreibung"
    },
    {
      "type": "embed",                   // Webseite/Doku eingebettet
      "url": "https://...",
      "caption": "Webseitenbeschreibung",
      "label": "Projektwebseite"
    }
  ],

  // Legacy-Felder (weiterhin unterstützt, werden automatisch normalisiert):
  "image": {
    "url": "https://upload.wikimedia.org/...",
    "caption": "...",
    "license": "CC BY-SA 3.0",
    "author": "...",
    "source": "Wikimedia Commons"
  },
  "video": {
    "url": "https://www.youtube-nocookie.com/embed/VIDEO_ID",
    "caption": "..."
  },

  // ── Verknüpfungen ────────────────────────────────────────────
  "links": [
    { "label": "Anzeigetext", "url": "https://..." }
  ],
  "connections": ["event-id-1", "event-id-2"],  // IDs müssen existieren
  "tags": ["Tag1", "Tag2"],
  "source": "Quellenangabe als Freitext"
}
```

### Session-Objekt (Kurs-Modus)

```js
{
  "id": "session-01",
  "date": "2026-03-10",
  "title": "Einführung: Nähtechnik",
  "desc": "Kurze Beschreibung",
  "events": ["event-id-1", "event-id-2"]
}
```

### Regeln

- `id`: kebab-case, Schlüsselwort + Jahr: `reprap-2007`, `singer-1851`
- `description`: eigene Formulierungen, keine Wikipedia-Kopien
- `image.url` / `media[].url`: nur Bilder mit freier Lizenz
- `video.url`: immer `youtube-nocookie.com/embed/` — nie direkte YouTube-Links
- `connections`: nur IDs die in der Datei existieren
- `significance`: `landmark` max. 5 Ereignisse pro Track
- Neues `media[]`-Array bevorzugen, Legacy-Felder `image`/`video` werden von `normalizeMedia()` automatisch konvertiert
