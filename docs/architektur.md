# StitchTexTech — Architektur und CSS

Aus `AGENTS.md` ausgelagert am 2026-09-23.

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
