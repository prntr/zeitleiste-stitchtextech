# AGENTS.md — StitchTexTech Timeline

> `AGENTS.md` is the canonical instruction file for **every** agent (Claude Code, Codex,
> Mistral). `CLAUDE.md` is a symlink to it — edit `AGENTS.md` only, never the symlink.
> House rules: see `~/Code/_std/AGENTS.base.md`.


Dieses Dokument steuert KI-Agenten bei der Arbeit an diesem Projekt.
Lies es vollständig bevor du Code schreibst oder Inhalte recherchierst.

---

## Projektkontext

**StitchTexTech** ist eine interaktive Web-Zeitleiste für den Bildungsbereich ( Uni LV für angehende LehrerInnen im Rahmen des Projekts Stitch(x), Lehramt Technik & Design, AHS Österreich).
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
├── design-example/     # Archiviertes Redesign-Beispiel, nicht Source of Truth
├── data/
│   ├── timeline.json   # Primär: wird per fetch() geladen (events, tracks, sessions)
│   ├── timeline.js     # Legacy: window.__timelineData = {...} (nicht mehr aktiv)
│   ├── sources.json    # Primär: Bibliografie-Array
│   └── sources.js      # Legacy (nicht mehr aktiv)
├── assets/
│   └── icons/
├── AGENTS.md           # Diese Datei
├── docs/              # Schema, Architektur, Stand (aus AGENTS.md ausgelagert)
├── PLAN.md
└── LICENSE             # MIT (Code) / CC BY-SA 4.0 (Inhalt)
```

**Wichtig:** Die App lädt `data/timeline.json` und `data/sources.json` per `fetch()` (kein globales `window.__timelineData` mehr). Für lokale Entwicklung muss ein HTTP-Server laufen (z.B. `python3 -m http.server`).

**Hinweis:** `design-example/` enthält ein archiviertes Redesign mit eigener Typografie- und Farbexploration. Verbindlich für die Haupt-App im Root bleiben die hier dokumentierten Vorgaben.

**LocalStorage:** Editierungen werden unter dem Schlüssel `stt-local-edits` gespeichert (JSON-Objekt, keyed by Event-ID). Beim Seitenaufruf werden Overrides automatisch auf die geladenen JSON-Daten angewendet.

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

---

## Dokumente

- `docs/daten-schema.md` — **verbindliches** Schema für `data/timeline.json`
  (Events, Tracks, Sessions, Medien). Vor jeder Datenänderung lesen.
- `docs/architektur.md` — `main.js`: State-Variablen, Render-Ablauf, Funktionen;
  CSS-Konventionen und Design-Tokens. Vor Änderungen an Code oder Styles lesen.
- `docs/stand.md` — aktueller Stand der Komponenten und offene Aufgaben.
- `PLAN.md` — Projektplan.

<!-- BEGIN _STD:SHARED_REFERENCES -->
## Shared references

- House rules and Code layout: `~/Code/_std/AGENTS.base.md`. Claude Code and Codex
  load it as their global instructions; do not read it a second time. Only an agent
  without a global instruction file reads it from here.
- Delivery pipeline: `~/Code/active/plattform/pipeline.md`. Read it before deploying
  or touching devices or the network; local-only work does not need it.

This managed block is checked by `~/Code/_std/bin/agents-doctor`; keep its markers intact.
<!-- END _STD:SHARED_REFERENCES -->
