# StitchTexTech Timeline — Projektplan

**Typ:** Interaktive Web-Zeitleiste für den Bildungsbereich
**Lizenz:** CC BY-SA 4.0 (Inhalt), MIT (Code)
**Zuletzt aktualisiert:** 2026-03-09

---

## Projektziel

Vernetztes Verständnis zeigen: wie Open-Hardware-/Software-Strömungen die Textiltechnologie demokratisiert haben — und wie das Stitch(x)-Projekt (Kurs LV, AHS Österreich) darin eingebettet ist.

Intellektueller Rahmen: Papert-Konstruktionismus, Gershenfeld „How to Make Almost Everything".

---

## Implementierungsstatus

### ✅ Phase 1 — Grundgerüst (BUILD_SCAFFOLD)
- `index.html`, `style.css`, `main.js` vollständig
- D3-Timeline mit Zoom, Pan, 7 Tracks
- Decade/Century-Marker, Track-Linien
- Sidebar mit Track-Labels

### ✅ Phase 2 — Daten & Inhalt (RESEARCH_AND_FILL v0.3)
- `data/timeline.json`: 45+ Events, 7 Tracks (A–G), 136+ Verbindungen
- `data/sources.json`: 30 Bibliografie-Einträge
- Track E: Pädagogik & Computational Thinking (Papert, Scratch, Snap!, TurtleStitch)
- Track F: Stitch(x) Projekt (StitchLAB, Klipper, Mainsail, TurtleStitch)
- Track G: Textildesign, Kunst & Material (Bauhaus-Weberei, Fasern, E-Textiles)
- 8 Kurs-Sessions (10.3.–28.4.2026) verknüpft
- 🔄 keine harten Bildlücken mehr; mehrere Events nutzen noch Logo-, Screenshot- oder Symbolbilder

### ✅ Phase 3a — Interaktivität (Kern)
- D3-Zoom (Scroll, Pinch, Rechtsklick-Pan, Trackpad-Swipe)
- Filter-Buttons pro Track (Toggle)
- Verbindungslinien (Bezier-Kurven, Toggle)
- Permanente Labels (Toggle)
- Volltextsuche live
- Session-Picker Dropdown (Kurs-Modus)
- URL-Hash: `#event-id` öffnet Ereignis direkt
- Keyboard: Tab + Enter/Space auf Events, ← → im Panel

### ✅ Kompakt-Modus (viewMode: 'single')
- Alle 7 Tracks auf eine horizontale Achse
- Greedy-Layering: 4 Ebenen [1, -1, 2, -2]
- Label-Karten mit Stem-Linien
- Zoom/Pan funktioniert, Filter/Suche/Session synchron
- Toggle-Button „Kompakt ↔ Tracks"

### ✅ Detail-Panel v2
- Rechts schwebend (`position: fixed`, `clamp(310px, 38vw, 460px)`)
- Slide-in von rechts, schließt nur explizit
- Media-Galerie: `image`, `video`, `embed`, `screenshot` mit Crossfade
- Connection Chips: verknüpfte Events als anklickbare Pills
- Prev/Next Navigation durch sichtbare Events (Fade-Out/In)
- ← → Pfeiltasten navigieren im Panel (wenn kein Input fokussiert, kein Präs.-Modus)
- Backwards-kompatibel: Legacy `image`/`video`-Felder werden normalisiert

### ✅ Verbindungen im Kompakt-Modus
- Quadratische Bezier-Bögen oberhalb der Achse
- Option A+B: globales Netz (opacity 0.12) + Fan-Highlight bei Selektion (0.72 / 0.05)
- Zoom/Pan-synchron, respektiert Filter/Suche/Session

### ✅ Edit-Modus + Persistenz
- ✏-Button im Panel → Formular mit allen Event-Feldern
- Dynamische Zeilen für Medien und Links
- Speichern → `localStorage` (`stt-local-edits`) + automatisch beim Seitenaufruf
- „↓ N Edits"-Button im Header → `timeline-edited.json` Export

### ✅ Session-Edit-Mode
- `[✏ bearbeiten]` Button im Header (nur sichtbar bei aktiver Session)
- Im Edit-Mode: Klick auf Event → in Session hinzufügen / entfernen
- CSS-Feedback: `.stt-ev-in-session` (weißer Ring) / `.stt-ev-out-session` (transparent)
- Persistenz in `localStorage` (`stt-local-sessions`), beim Start wiederhergestellt
- Export-Button zeigt sich auch bei Session-Edits

### ✅ Session-Manager
- `[⚙ Sessions]` Button öffnet Modal
- Sessions umbenennen (Titel, Datum, Beschreibung)
- Neue Sessions anlegen (sofort im Dropdown verfügbar)
- Sessions löschen (mit Bestätigung)
- Alle Änderungen in localStorage persistiert, im JSON-Export enthalten

### ✅ Präsentations-Modus
- `[▶ Präsentieren]` Button im Header
- Overlay: Light-Theme, Zwei-Spalten-Layout (Text links, Bild rechts, sticky)
  - Trackbar, Jahr, Badge, Titel, Untertitel, Galerie, Beschreibung, Connection-Chips
  - Counter `3 / 8`, Prev/Next-Buttons
- Keyboard: ← → navigiert, Escape schließt
- Scope-Toggle: „Session ⇄ Alle sichtbaren Events" ohne Overlay zu schließen
- Timeline pulsiert beim aktiven Event (`.stt-ev-presenting`), wird abgedunkelt
- Auto-Scroll: Timeline zentriert bei Event wenn außerhalb Viewport
- Responsive: unter 780px einspaltiges Layout

### ✅ Tooltip-Verbesserungen
- Vorschaubild (erstes `image`/`screenshot`) im Hover-Tooltip
- Tooltip klappt nach unten (`.is-flipped`) wenn zu wenig Platz nach oben (Track A)
- Tooltip-Breite 240px

### 📋 Phase 4 — Polish (TODO)
- [ ] Druckansicht: A3 quer, alle Tracks, Quellen als Fußnoten
- [ ] Barrierefreiheit-Audit (WCAG 2.1 AA)
- [ ] `prefers-reduced-motion` vollständig
- [ ] Favicon (SVG, Spule/Nadel)
- [ ] README.md
- [ ] Edit-Modus: einzelnes Event auf Original zurücksetzen
- [ ] Galerie-Keyboard-Navigation (← → innerhalb der Galerie)

---

## Architektur

### Dateistruktur

```
ZeitleisteStitchTexTech/
├── index.html          # Einzige HTML-Seite
├── style.css           # Alle Styles (Custom Properties, kein Framework)
├── main.js             # App-Logik (IIFE, D3.js v7)
├── data/
│   ├── timeline.json   # Primär — per fetch() geladen
│   ├── sources.json    # Primär — Bibliografie
│   ├── timeline.js     # Legacy (nicht mehr aktiv)
│   └── sources.js      # Legacy (nicht mehr aktiv)
├── assets/icons/
├── AGENTS.md
├── PLAN.md             # Dieser Plan
└── LICENSE
```

### Layout (Multi-Track)

```
┌─ Header: Brand · Session · ✏ · ⚙ · ▶ · Suche · Controls ────────┐
├─ Sidebar ──┬─ SVG-Timeline ─────────────────────────────────────── ┤
│ A ████████ │  1700   1800   1900   2000   2030                     │
│ B ████████ │  ─●──────────●─────────────●─── A (rot)              │
│ C ████████ │  ────●──────────────●──────●─── B (grün)             │
│ D ████████ │  ──────●────●──────────●───────── C (blau)           │
│ E ████████ │  ─────────────────●──────────●── D (grau)            │
│ F ████████ │  ─────────────────────●────●──── E (lila)            │
│ G ████████ │  ─────────────────────────────●─ F (orange)          │
└────────────┴──────────────────────────────────────────────────────┘
                                      ┌─ Detail-Panel (rechts) ─────┐
                                      │ [←][→] 1851 · Track A       │
                                      │ Singer Sewing Machine Co.   │
                                      │ [Bild/Video/Embed Galerie]  │
                                      │ Beschreibung...             │
                                      │ Verbunden mit: [chip][chip] │
                                      │ [↗ Wikipedia] [↗ Smithsonian│
                                      └─────────────────────────────┘
```

### Präsentations-Overlay

```
┌─ Präsentations-Overlay (Fullscreen, abgedunkelt) ─────────────────┐
│ ┌─ Karte (85vw, 97vh) ────────────────────────────────────────┐   │
│ │ ████ Trackbar                                                │   │
│ │ ● 1863  [Track A]   [Session ⇄ Alle]              [×]       │   │
│ │                                       ┌──────────────────┐  │   │
│ │ Titel (groß)                           │                  │  │   │
│ │ Untertitel (kursiv)                    │   Bild (sticky)  │  │   │
│ │                                        │                  │  │   │
│ │ Beschreibung...                        └──────────────────┘  │   │
│ │ [chip] [chip]                                                 │   │
│ │ ─────────────────────────────────────────────────────────── │   │
│ │ [← Zurück]          3 / 8              [Weiter →]           │   │
│ └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Tracks

| Track | Inhalt | Farbe | Dash |
|-------|--------|-------|------|
| A | Näh- & Stickmaschinen (kommerziell) | `#C0392B` | `10,5` |
| B | Open-Source-Textilmaschinen DIY | `#27AE60` | `5,4` |
| C | Open Hardware / DIY-Technologie | `#2980B9` | `14,3,2,3` |
| D | Allgemeine Technologie (Kontext) | `#7F8C8D` | — |
| E | Pädagogik & Computational Thinking | `#9B59B6` | `6,3` |
| F | Stitch(x) Projekt | `#E67E22` | `2,3` |
| G | Textildesign, Kunst & Material | `#A66E4A` | `9,4` |

---

## Schlüssel-Events (IDs)

| ID | Track | Jahr | Bedeutung |
|----|-------|------|-----------|
| `schiffli-1863` | A | 1863 | Schiffli-Stickmaschine (Studienreise Lustenau) |
| `singer-1851` | A | 1851 | Singer als Landmark |
| `reprap-2007` | B | 2007 | Startpunkt DIY-Kaskade |
| `inkstitch-2017` | B | 2017 | Open-Source Stickerei |
| `klipper-2016` | C | 2016 | Firmware für StitchLAB |
| `mainsail-2020` | C | 2020 | Web-UI für StitchLAB |
| `papert-logo-1967` | E | 1967 | Konstruktionismus-Ursprung |
| `snap-2011` | E | 2011 | Basis von TurtleStitch |
| `turtlestitch-2016` | F | 2016 | Kernsoftware Stitch(x) |
| `stitchlab-2024` | F | 2024 | Das Kurs-Projekt selbst |

---

## Daten-Schema (aktuell)

### Event (vollständig)

```js
{
  id:           "kebab-case-pflicht",
  year:         2007,
  month:        null,              // optional, 1–12
  track:        "A|B|C|D|E|F|G",
  title:        "≤60 Zeichen",
  subtitle:     "optional",
  description:  "2–4 Sätze, Deutsch, sachlich",
  significance: "low|medium|high|landmark",

  // Medien — neues Format (bevorzugt):
  media: [
    { type: "image",       url: "...", caption: "...", license: "...", author: "...", source: "..." },
    { type: "video",       url: "https://www.youtube-nocookie.com/embed/ID", caption: "..." },
    { type: "embed",       url: "https://...", caption: "...", label: "Webseite" },
    { type: "screenshot",  url: "...", caption: "..." }
  ],

  // Legacy (weiterhin unterstützt, normalizeMedia() konvertiert automatisch):
  image: { url: "...", caption: "...", license: "...", author: "...", source: "..." },
  video: { url: "https://www.youtube-nocookie.com/embed/ID", caption: "..." },

  links:       [{ label: "Text", url: "https://..." }],
  connections: ["event-id-1", "event-id-2"],  // müssen existieren
  tags:        ["Tag1", "Tag2"],
  source:      "Quellenangabe Freitext"
}
```

### Session

```js
{
  id:     "session-01",
  date:   "2026-03-10",
  title:  "Einführung: Nähtechnik",
  desc:   "Kurze Beschreibung der Session",
  events: ["event-id-1", "event-id-2"]
}
```

Sessions können über den `[⚙ Sessions]`-Button im UI verwaltet werden (anlegen, umbenennen, löschen). Änderungen werden in `localStorage` (`stt-local-sessions`) gespeichert.

---

## Kurs-Sessions (Stitch(x), 2026)

| Session | Datum | Thema |
|---------|-------|-------|
| s01 | 10.03. | Kennenlernen & erste Maschine |
| s02 | 16.03. | TurtleStitch #1 (DOK) |
| s03 | 17.03. | TurtleStitch #2 (Coding Lab) |
| s04 | 20.03. | TurtleStitch #3 |
| s05 | 24.03. | Einfach sticken: Ink/Stitch |
| s06 | 14.04. | Digitale & KI-Wording StitchLAB |
| s07 | 21.04. | Hardware: De/Konstruktion |
| s08 | 28.04. | Studienreise Lustenau / St. Gallen |

---

## Inhalt noch offen

### Bildqualität verbessern
Priorität: Landmark-Events und Track-F-Events zuerst.

Vorgehen:
1. Wikimedia Commons suchen (Direktlink zur Dateiseite)
2. Originalfoto oder zeitgenössisches Bild vor Logo/Symbolbild bevorzugen
3. `media[].type = "image"` mit vollständigen Metadaten eintragen
4. Falls kein freies Bild: Screenshot der Projektwebseite als `type: "embed"` oder `type: "screenshot"`
5. `url: "TODO"` nur wenn wirklich nichts gefunden

### Track F (Stitch(x) Projekt)
- Detailliertere Beschreibungen für StitchLAB-Events
- Video-Dokumentation des Projekts verlinken
- Studienreise Lustenau (27.–31.4.) als Event-Cluster

---

## Technische Schulden / bekannte Einschränkungen

- Wheel-Listener: einmalig in `init()` registriert (kein Memory-Leak)
- `renderAxis()` akzeptiert optionalen `innerH`-Parameter für Kompakt-Modus
- `applyEventVisibility()` muss nach jeder State-Änderung aufgerufen werden
- Kompakt-Modus: Layer-Zuweisung fix beim Aufbau, kein Re-Layout beim Zoom
- Panel: `media[]` + Legacy-Felder koexistieren, `normalizeMedia()` als Bridge
- `isFadedEvent()` ist module-level extrahiert und wird von Panel-Nav, Pres-Mode und `applyEventVisibility()` gemeinsam genutzt

---

## Qualitätsprüfung vor Abgabe

- [ ] Alle `connections`-IDs existieren als Event-IDs
- [ ] Alle Bild-URLs erreichbar (200 OK)
- [ ] Alle Video-URLs gültige youtube-nocookie.com-Embeds
- [ ] Keine JS-Fehler in der Browser-Konsole
- [ ] Multi-Track ↔ Kompakt-Toggle ohne Fehler
- [ ] Panel öffnet für alle Events (inkl. Events ohne Media)
- [ ] Filter, Suche, Session-Picker in beiden View-Modi
- [ ] Session-Edit-Mode: Events hinzufügen/entfernen, nach Reload persistent
- [ ] Präsentations-Modus: Overlay, ← →, Escape, Scope-Toggle
- [ ] Session-Manager: Anlegen, Umbenennen, Löschen
- [ ] Tooltip: Bild sichtbar, Flip bei Track A funktioniert
- [ ] Responsive: 375 px / 768 px / 1440 px
- [ ] Keyboard: Tab + Enter/Space auf Events, ← → im Panel
