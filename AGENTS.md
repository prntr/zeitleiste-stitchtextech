# AGENTS.md — StitchTexTech Timeline

Dieses Dokument steuert KI-Agenten bei der Arbeit an diesem Projekt.
Lies es vollständig bevor du Code schreibst oder Inhalte recherchierst.

---

## Projektkontext

**StitchTexTech** ist eine interaktive Web-Zeitleiste für den Bildungsbereich (LV Stitch(x), Lehramt Technik & Design, AHS Österreich).
Zielgruppe: angehende Lehrpersonen mit textilen Vorkenntnissen, wenig Tech-Background.
Intellektueller Rahmen: Papert-Konstruktionismus, Gershenfeld „How to Make Almost Everything".

### Tracks (7)

| Track | Inhalt | Farbe |
|-------|--------|-------|
| A | Näh- & Stickmaschinen (kommerziell) | `#C0392B` |
| B | Open-Source-Textilmaschinen (DIY: Knit, Stick, Näh, Spin) | `#27AE60` |
| C | Open Hardware / DIY-Technologie | `#2980B9` |
| D | Allgemeine Technologie (Kontext) | `#7F8C8D` |
| E | Pädagogik & Computational Thinking | `#9B59B6` |
| F | Stitch(x) Projekt (Kurskontext) | `#E67E22` |
| G | Textildesign, Kunst & Material | `#A66E4A` |

**Kernprojekt (Track F):** StitchLAB = Pfaff-Nähmaschine + Raspberry Pi + Klipper + Mainsail (geforkted) + TurtleStitch (Snap!-basiert, Wien).

---

## Tech-Stack (verbindlich)

- **HTML5** + **CSS Custom Properties** — kein CSS-Framework
- **Vanilla JavaScript** (IIFE-Pattern, kein ES-Module-System) — kein React/Vue/Svelte
- **D3.js v7** (via CDN) — für SVG-Timeline, Zoom, Datenbindung
- **IBM Plex Mono + IBM Plex Sans** (Google Fonts) — Typografie
- **Keine Build-Tools** — direkt im Browser lauffähig
- **Keine Cookies, keine Analytics, kein Backend**

CDN-Links (genau diese verwenden):
```html
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

---

## Dateistruktur

```
ZeitleisteStitchTexTech/
├── index.html          # Einzige HTML-Seite
├── style.css           # Alle Styles
├── main.js             # Gesamte App-Logik (IIFE)
├── data/
│   ├── timeline.json   # Primär: wird per fetch() geladen (events, tracks, sessions)
│   ├── timeline.js     # Legacy: window.__timelineData = {...} (nicht mehr aktiv)
│   ├── sources.json    # Primär: Bibliografie-Array
│   └── sources.js      # Legacy (nicht mehr aktiv)
├── assets/
│   └── icons/
├── AGENTS.md           # Diese Datei
├── PLAN.md
└── LICENSE             # MIT (Code) / CC BY-SA 4.0 (Inhalt)
```

**Wichtig:** Die App lädt `data/timeline.json` und `data/sources.json` per `fetch()` (kein globales `window.__timelineData` mehr). Für lokale Entwicklung muss ein HTTP-Server laufen (z.B. `python3 -m http.server`).

**LocalStorage:** Editierungen werden unter dem Schlüssel `stt-local-edits` gespeichert (JSON-Objekt, keyed by Event-ID). Beim Seitenaufruf werden Overrides automatisch auf die geladenen JSON-Daten angewendet.

---

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

---

## Aktueller Stand

| Komponente | Status |
|-----------|--------|
| BUILD_SCAFFOLD | ✅ fertig |
| RESEARCH_AND_FILL | ✅ v0.3 — 45+ Events, 6 Tracks (A–F), 136+ Verbindungen, 8 Sessions |
| Kompakt-Modus | ✅ fertig — alle Events auf einer Achse, 4-Ebenen-Layering, Verbindungsbögen |
| Verbindungen Kompakt | ✅ fertig — Bogen-Overlay (Option A: 0.12 global) + Fan (Option B: 0.72 bei Selektion) |
| Detail-Panel v2 | ✅ fertig — rechts schwebend, Galerie, Chips, Prev/Next-Nav |
| Edit-Modus | ✅ fertig — Panel-Edit + localStorage-Persistenz + JSON-Export |
| BUILD_INTERACTIVITY | 🔄 teilweise — Zoom ✅, Filter ✅, Verbindungen ✅, Labels ✅, Suche ✅, Session-Picker ✅ |
| Keyboard-Navigation | 🔄 Tab/Enter vorhanden, Pfeil-Nav offen |
| Bilder | 🔄 keine harten Bildlücken mehr, aber mehrere Events noch mit Logo/Symbolbild/Repo-Asset statt starkem Originalmedium |
| POLISH (Druck, a11y) | 📋 TODO |

---

## Architektur: main.js

Alles in einer IIFE `(function () { 'use strict'; ... })();`. Keine Module.

### Wichtige State-Variablen

```js
let xScale, currentXScale, zoomBehavior, svgSel;
let activeFilters  = new Set(TRACK_IDS);  // aktive Track-Filter
let showConn       = false;               // Verbindungslinien sichtbar?
let showLabels     = false;               // permanente Labels?
let selectedId     = null;               // geöffnetes Ereignis
let searchQuery    = '';
let activeSession  = null;               // Kurs-Modus: aktive Session
let viewMode       = 'multi';            // 'multi' | 'single' (Kompakt)
let collapsedLayerMap = null;            // Map<eventId, layer> für Kompakt
const COLL = { cardW: 108, cardH: 40, layerGap: 6, stemGap: 3 };
let galleryItems = [], galleryIdx = 0;   // aktive Medien-Galerie
let navEvents = [], navIdx = 0;          // Panel-Navigation (sichtbare Events)
let labelGroupSel = null;
let editingId = null;                    // ID des Events im Edit-Formular
```

### Wichtige Funktionen

| Funktion | Beschreibung |
|----------|-------------|
| `buildSVG()` | Multi-Track-Ansicht aufbauen |
| `buildCollapsedSVG()` | Kompakt-Ansicht aufbauen (alle Events auf einer Achse) |
| `computeCollapsedLayers(sc)` | Greedy-Layerzuweisung [1, -1, 2, -2] |
| `renderEvents(g, sc, h)` | Ereigniskreise rendern |
| `renderCollapsedCards(stemG, cardG, sc, axisY, h)` | Karten + Stems im Kompakt-Modus |
| `renderCollapsedConnections(g, sc, axisY, h)` | Verbindungsbögen im Kompakt-Modus rendern |
| `updateCollapsedConnVisibility()` | Bogen-Opazität nach State (showConn, selectedId) |
| `collArcPath(src, tgt, sc, axisY, h)` | SVG-Pfad für einen Verbindungsbogen |
| `onZoom(event, ...)` | Zoom-Handler Multi-Track |
| `onCollapsedZoom(event, ...)` | Zoom-Handler Kompakt |
| `openPanel(ev)` | Panel öffnen (erste Öffnung) |
| `renderPanelContent(ev)` | Panel-Inhalt befüllen |
| `switchPanelTo(ev)` | Fade-Out/In zu neuem Ereignis |
| `buildGallery(items)` | Media-Galerie aufbauen |
| `buildConnectionChips(ev)` | Verbindungs-Chips rendern |
| `updatePanelNav()` | Prev/Next-Buttons auf sichtbare Events beschränken |
| `normalizeMedia(ev)` | Legacy `image`/`video` → `media[]` konvertieren |
| `applyEventVisibility()` | Filter/Suche/Session auf alle Elemente anwenden |
| `openEditMode(ev)` | Edit-Formular im Panel öffnen |
| `closeEditMode()` | Edit-Formular schließen, View wiederherstellen |
| `buildEditForm(ev)` | Formular-DOM dynamisch aufbauen |
| `saveEditForm()` | Formular lesen, validieren, in-memory + localStorage speichern |
| `loadLocalEdits()` | localStorage-Overrides beim Start auf Daten anwenden |
| `saveLocalEdit(id, changes)` | Einzelnes Event in localStorage speichern |
| `exportData()` | Aktuelle Daten als `timeline-edited.json` herunterladen |
| `updateExportBadge()` | Export-Button im Header ein-/ausblenden |

### Zwei View-Modi

**Multi-Track** (`viewMode = 'multi'`):
- 6 horizontale Tracks, jede Linie auf eigener Y-Position
- Sidebar links (Track-Labels)
- SVG-Gruppen: bands → markers → axis → mainG(conn → lines → events → labels)

**Kompakt** (`viewMode = 'single'`):
- Alle Events auf `AXIS_Y = h/2`
- Keine Sidebar
- SVG-Gruppen: markers → axis → mainG(collapsed-line → **collConnG** → stems → cards → events)
- Karten gestaffelt auf 4 Ebenen (Layer 1, -1, 2, -2)
- Verbindungsbögen: quadratische Bezier-Kurven, immer oberhalb der Achse
  - `showConn=false` → opacity 0
  - `showConn=true, kein selectedId` → alle Bögen opacity 0.12 (globales Netz)
  - `showConn=true, selectedId gesetzt` → eigene Bögen 0.72, Rest 0.05 (Fan-Modus)

---

## CSS-Konventionen

Klassen-Präfix: `stt-` (StitchTexTech). BEM-ähnlich.

### Aktuelle Design-Tokens (`:root`)

```css
--track-a: #C0392B;   --track-b: #27AE60;
--track-c: #2980B9;   --track-d: #7F8C8D;
--track-e: #9B59B6;   --track-f: #E67E22;
--bg: #FAFAF8;        --surface: #FFFFFF;
--border: #E5E7EB;    --text: #1A1A1A;
--muted: #6B7280;     --accent: #B87333;   /* Kupfer */
--radius: 3px;        --radius-lg: 10px;
--font-mono: 'IBM Plex Mono', monospace;
--font-sans: 'IBM Plex Sans', sans-serif;
--header-h: 62px;     --footer-h: 38px;
--sidebar-w: 148px;
```

### Wichtige CSS-Klassen

| Klasse | Verwendung |
|--------|-----------|
| `.stt-event` | SVG-Kreise (alle Events) |
| `.stt-event.is-faded` | ausgefadetes Event (opacity 0.12) |
| `.stt-event.is-selected` | ausgewähltes Event (glow) |
| `.stt-event.is-landmark` | weißer Rand |
| `.stt-card-group` | Kompakt-Modus: Label-Karten |
| `.stt-card-group.is-faded` | opacity 0.1 |
| `.stt-stem` | Kompakt-Modus: Verbindungslinie Kreis→Karte |
| `.stt-collapsed-line` | Horizontale Achsenlinie im Kompakt-Modus |
| `.stt-panel` | Detail-Panel (rechts, `position: fixed`) |
| `.stt-panel.is-open` | `translateX(0)` — Panel sichtbar |
| `.stt-panel__body.is-fading` | opacity 0 bei Switch-Animation |
| `.stt-conn-chip` | Verbindungs-Chip im Panel |
| `.stt-gallery__stage > .is-active` | sichtbares Medium in Galerie |
| `.stt-collapsed-conn` | Verbindungsbogen im Kompakt-Modus (fill:none, dashed) |
| `.stt-panel__edit-btn` | Bleistift-Button im Panel-Header |
| `.stt-panel__edit-btn.is-active` | Edit-Modus aktiv |
| `.stt-edit-form` | Edit-Formular (flex:1, Geschwister von stt-panel__body) |
| `.stt-edit-form[hidden]` | display:none |
| `.stt-edit-dyn-row--link` | Dynamische Link-Zeile (Label + URL) |
| `.stt-edit-dyn-row--media` | Dynamische Media-Zeile (type + URL + Caption) |

---

## Quellenregeln (STRIKT)

Erlaubte Bildquellen (Prioritätsreihenfolge):
1. **Wikimedia Commons** — bevorzugt
2. **Smithsonian Open Access** (CC0)
3. **Europeana** — freie Lizenzen prüfen
4. **Internet Archive** — public domain
5. **Offizielle Projektwebseiten** — nur wenn Lizenz explizit CC oder MIT
6. **GitHub** — nur wenn Repository-Lizenz passt

**Verboten:** Getty Images, Shutterstock, urheberrechtlich geschützte Bilder ohne Lizenz, KI-generierte Bilder.

### Medientyp-Regeln

`GRÜN — direkt verwendbar`
- `Public Domain`, `CC0`, `CC BY`, `CC BY-SA`
- Historische Scans, Patentzeichnungen mit dokumentierter Freigabe
- Videos: öffentlicher Embed (youtube-nocookie.com)

`GELB — nur mit dokumentierter Prüfung`
- `GPL`/`GFDL`-Bilder, GitHub-Assets (Lizenzkette prüfen)
- `CC BY-NC` nur nach ausdrücklicher User-Freigabe
- Screenshots: nur wenn Herkunft und Rechte dokumentiert

`ROT — nicht verwenden`
- Kein Lizenzhinweis, `All rights reserved`
- Pressebilder, Produktfotos, Social-Media-Bilder
- YouTube-Thumbnails zum Rehosten

### Motivwahl nach Ereignistyp

Nicht jede Kategorie braucht dieselbe Bildlogik. Ein Medium ist nur dann gut, wenn es den Ereignistyp direkt erklärt.

- `Maschine / Gerät / Prototyp / Patent`: echtes Objekt, Patentmodell, technische Zeichnung oder Museumsfoto. Kein Logo als Primärmedium.
- `Software / Interface / Dateiformat / Plattform`: UI-Screenshot, offizielle Demo, Tutorial-Video oder aussagekräftige Output-Grafik. Ein Bürofoto ist hier schlechter als Logo oder Screenshot.
- `Organisation / Bewegung / Lizenz / Standard`: Logo, Wortmarke, Emblem oder offizielles Symbol kann Primärmedium sein, wenn genau diese Identität das Ereignis trägt.
- `Person`: Porträt oder zeitgenössische Abbildung.
- `Ort / Fabrik / Region / Studienreise`: Ortsbild, Fabrikansicht, Karte oder Archivfoto.
- `Buch / Theorie / Pädagogisches Konzept`: Buchcover nur bei sauberer Rechtebasis, sonst Autorporträt oder archivalischer Kontext.
- `Abstraktes System / Protokoll / Infrastruktur`: Schema, Karte, Interface oder konkrete Hardware statt beliebiger Symbolfotos.

### Fehlgriff-Regel

Ein vorhandenes Medium gilt trotzdem als unpassend, wenn mindestens einer dieser Punkte zutrifft:

- Es zeigt nicht den eigentlichen Gegenstand des Events.
- Es erklärt das Event schlechter als Logo, Screenshot, Patentzeichnung oder Objektfoto.
- Es ist nur dekorativ (`Bürofoto`, `allgemeine Maschine`, `Kontextbild`), aber nicht identifizierend.
- Es ist zwar frei lizenziert, aber didaktisch schwach.

### Entscheidungsregel

Medium nur eintragen wenn alle `ja`:
1. Ursprungsquelle bekannt?
2. Konkrete Datei/Embed auffindbar?
3. Lizenz explizit genannt?
4. Urheber, Quelle, Lizenz dokumentierbar?
5. Nutzungsart (direkt / embed / link) geklärt?
6. Motiv passt semantisch zum Ereignistyp?

→ `nein`: `"url": "TODO"` oder `"media": []` eintragen, nicht erfinden.

### Quellenformat (sources.js, Chicago Author-Date)

```js
{
  "id": "bowyer-2007",
  "type": "website|book|article|patent|github",
  "author": "Bowyer, Adrian",
  "year": 2007,
  "title": "RepRap — Replicating Rapid Prototyper",
  "url": "https://reprap.org",
  "accessed": "2024-01-15",
  "license": "GPL v2"
}
```

---

## Offene Aufgaben (TODO)

### Inhalte
- [ ] Alle Events typbasiert auditieren: `fehlend` / `mismatch` / `schwach` / `stark`
- [ ] Track F vollständig befüllen (StitchLAB-Projekt-Events)
- [ ] Session-Inhalte überprüfen (Studienreise Lustenau/St. Gallen 27.–31.4.)

### Interaktivität
- [ ] Keyboard-Pfeilnavigation zwischen Events (← → chronologisch)
- [x] URL-Hash: `#event-id` direkt öffnen ✅
- [ ] Galerie: Keyboard-Navigation mit ← → innerhalb der Galerie

### POLISH
- [ ] Druckansicht (A3 quer, alle Tracks, Quellen als Fußnoten)
- [ ] Barrierefreiheit-Audit (WCAG 2.1 AA)
- [ ] `prefers-reduced-motion` vollständig berücksichtigen
- [ ] Favicon (SVG, Spule/Nadel)

---

## Häufige Fehler (vermeiden)

1. **Kein direktes YouTube-Embed** — immer `youtube-nocookie.com/embed/ID`
2. **Keine Wikipedia-Kopien** — paraphrasieren und zitieren
3. **Keine externen Bilder ohne Lizenzcheck** — immer Lizenz im `media[]`-Objekt
4. **Keine neuen Event-Listener in `buildSVG()`** — Memory-Leak, einmalig in `init()` registrieren
5. **D3 und DOM API nicht mischen** — D3 für SVG-Elemente, DOM API für HTML-Elemente
6. **`applyEventVisibility()` nach jeder State-Änderung aufrufen** — hält Filter, Suche, Session und Kompakt-Modus synchron
7. **`normalizeMedia(ev)` verwenden** — nicht direkt auf `ev.image`/`ev.video` zugreifen
8. **Keine `console.log`** — `console.debug('[STT] ...')` für Debug-Ausgaben
9. **Edit-Modus schließen vor Panel-Wechsel** — `closeEditMode()` am Anfang von `closePanel()` und `switchPanelTo()` aufrufen
10. **Nach `saveEditForm()` sowohl Panel als auch Timeline neu rendern** — `renderPanelContent()` + `buildSVG()` / `buildCollapsedSVG()`

---

## Qualitätskriterien

- [ ] Alle Bild-URLs liefern 200 OK
- [ ] Alle Video-URLs sind gültige YouTube-Embeds (youtube-nocookie.com)
- [ ] Alle `connections`-IDs existieren als Ereignis-IDs
- [ ] Kein JavaScript-Fehler in der Browser-Konsole
- [ ] Multi-Track und Kompakt-Modus wechseln ohne Fehler
- [ ] Panel öffnet sich für alle Events korrekt (inkl. Events ohne Media)
- [ ] Filter, Suche und Session-Picker funktionieren in beiden View-Modi
- [ ] Responsive: funktioniert bei 375 px, 768 px, 1440 px

---

## Kommunikation

- Sprache: **Deutsch**
- Kurze Statusmeldungen am Ende jeder Phase
- Offene Lizenzfragen markieren: `⚠️ LIZENZ PRÜFEN:`
- Fehlende Ressourcen: `"url": "TODO"` — nie erfinden
