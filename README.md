# StitchTexTech — Interaktive Zeitleiste

Interaktive Web-Zeitleiste zur Geschichte von Näh- & Stickmaschinen, Open-Source-Textiltechnologie, Open Hardware und Pädagogik.

Entwickelt für die Lehrveranstaltung **Stitch(x)** — Lehramt Technik & Design, AHS Österreich.

**→ [Live-App](https://prntr.github.io/zeitleiste-stitchtextech/)**

---

## Tracks

| Track | Thema | Farbe |
|-------|-------|-------|
| A | Näh- & Stickmaschinen (kommerziell) | Rot |
| B | Open-Source-Textilmaschinen (DIY) | Grün |
| C | Open Hardware / DIY-Technologie | Blau |
| D | Allgemeine Technologie (Kontext) | Grau |
| E | Pädagogik & Computational Thinking | Violett |
| F | Stitch(x) Projekt (Kurskontext) | Orange |
| G | Textildesign, Kunst & Material | Braun |

---

## Lokale Entwicklung

Kein Build-Tool nötig. Die App lädt JSON-Dateien per `fetch()` — ein lokaler HTTP-Server ist erforderlich:

```bash
cd ZeitleisteStitchTexTech
python3 -m http.server
```

Dann im Browser öffnen: `http://localhost:8000`

---

## Mitmachen

Beiträge sind willkommen — neue Ereignisse, Korrekturen, Bilder, Übersetzungen.

→ Lies zuerst [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Tech-Stack

- Vanilla JavaScript (IIFE, kein Framework)
- D3.js v7 (CDN)
- IBM Plex Fonts
- Keine Build-Tools, keine Abhängigkeiten

---

## Lizenz

Code: [MIT](LICENSE) · Inhalte: [CC BY-SA 4.0](LICENSE)
