# Open-Source-Textiltech: Recherche fuer StitchTexTech

Stand: 2026-03-25

Diese Notiz bereitet Open-Source-Textiltechnik fuer die StitchTexTech-Timeline auf. Fokus ist Track `B` mit Schwerpunkt auf offenen Strickmaschinen, offenen Stick-Workflows und DIY-Stickmaschinen.

## Kurzbefund

- Bereits solide im Datensatz vertreten: `AYAB`, `Knitic`, `OpenKnit`, `Circular Knitic`, `Ink/Stitch`, `TurtleStitch`.
- Beim Quellencheck waren mehrere Repo-Links veraltet. Diese wurden in `data/timeline.json` und `data/sources.json` auf aktuelle Pfade korrigiert.
- `OpenKnit` ist inhaltlich weiterhin zentral, aber das aktuelle GitHub-Repo hat keine maschinenlesbare SPDX-Lizenz. Fuer Code- oder Medienuebernahmen also `⚠️ LIZENZ PRUEFEN`.
- `Embroiderino` ist wichtig, aber zwei Datenebenen muessen getrennt werden:
  - Projektursprung: 2018, dokumentiert auf LordOvervolt.
  - aktueller GitHub-Spiegel/Neuaufzug: 2024 bei `openembroidery/embroiderino`.

## Prioritaet fuer neue Track-B-Eintraege

| Prioritaet | ID | Jahr | Projekt | Warum relevant |
|---|---|---:|---|---|
| hoch | `twitterknitter-2013` | 2013 | TwitterKnitter | Frueher Maker-Hack: alte Strickmaschine, Arduino, Python und soziale Medien in einem funktionierenden Textil-Interface. |
| hoch | `embroidermodder-2013` | 2013 | Embroidermodder | Offenes Grundwerkzeug zum Lesen, Bearbeiten und Konvertieren von Stickdateien; wichtige Infrastruktur fuer offene Stick-Workflows. |
| hoch | `embroiderino-2018` | 2018 | Embroiderino | DIY-Umbau einer normalen Naehmaschine zur digitalen Stickmaschine; zentral fuer offene Stickhardware. |
| mittel | `knitout-2017` | 2017 | knitout | Maschinenunabhaengiges Befehlsformat fuer maschinelles Stricken; wichtig als offener Standard statt nur als Einzelmaschine. |
| optional | `pembroider-2020` | 2020 | PEmbroider | Starker Kandidat an der Grenze von Track B und E: generative Stickerei, Creative Coding, Schule/Maker-Kontext. |

## Timeline-taugliche Kandidaten

### 1. TwitterKnitter

```json
{
  "id": "twitterknitter-2013",
  "year": 2013,
  "track": "B",
  "title": "TwitterKnitter",
  "subtitle": "Tweets als Muster fuer eine analoge Strickmaschine",
  "description": "TwitterKnitter entstand 2013 im TOG Hackerspace in Dublin. Das Projekt ruestet eine mechanische Empisal Knitmaster 321 mit Arduino Mega, Servos, Lasercut-Teilen und Python-Software nach, sodass Tweets in gestrickte Muster uebersetzt werden. Es ist ein fruehes, gut dokumentiertes Beispiel dafuer, wie Maker-Kultur alte Textilmaschinen mit offener Elektronik und Netzkommunikation neu nutzbar macht.",
  "significance": "medium",
  "media": [],
  "links": [
    { "label": "TOG-Projektseite", "url": "https://www.tog.ie/2013/08/the-twitterknitter/" },
    { "label": "GitHub", "url": "https://github.com/tangentmonger/twitterknitter" }
  ],
  "connections": ["ayab-2011", "knitic-2012", "openknit-2014", "arduino-2005"],
  "tags": ["Strickmaschine", "Arduino", "Python", "Hackerspace", "Social Media"],
  "source": "TOG Hackerspace, \"The TwitterKnitter\", 2013; GitHub tangentmonger/twitterknitter (GPL v2)"
}
```

### 2. Embroidermodder

```json
{
  "id": "embroidermodder-2013",
  "year": 2013,
  "track": "B",
  "title": "Embroidermodder",
  "subtitle": "Freie Software fuer Stickdateien und Maschinenformate",
  "description": "Embroidermodder ist freie, plattformuebergreifende Software zum Anzeigen, Bearbeiten und Konvertieren von Maschinenstickdateien. Das Projekt schliesst eine zentrale Luecke in einem Feld, das sonst stark von proprietaeren Dateiformaten und teurer Spezialsoftware gepraegt ist. Fuer offene Stick-Workflows ist Embroidermodder deshalb eher Infrastruktur als nur ein Einzeltool.",
  "significance": "high",
  "media": [],
  "links": [
    { "label": "Projektwebseite", "url": "https://www.libembroidery.org" },
    { "label": "GitHub", "url": "https://github.com/Embroidermodder/Embroidermodder" }
  ],
  "connections": ["digital-embroidery-1990", "inkstitch-2017", "turtlestitch-2016", "embroiderino-2018"],
  "tags": ["Stickerei", "Dateiformate", "Open Source", "Software", "Infrastruktur"],
  "source": "Embroidermodder/Embroidermodder auf GitHub, erstellt 2013, zlib-Lizenz"
}
```

### 3. Embroiderino

```json
{
  "id": "embroiderino-2018",
  "year": 2018,
  "track": "B",
  "title": "Embroiderino",
  "subtitle": "DIY-Umbau von Naehmaschinen zu digitalen Stickmaschinen",
  "description": "Embroiderino dokumentiert seit 2018 einen offenen Umbaupfad, mit dem sich gewoehnliche Naehmaschinen in digitale Stickmaschinen verwandeln lassen. Das Projekt kombiniert 3D-gedruckte Mechanikteile, Stepper-gesteuerte Rahmenbewegung, eigene Firmware und eine Python-Host-Software. Fuer die StitchTexTech-Timeline ist es der bislang staerkste DIY-Hardware-Kandidat im Bereich offene Stickmaschinen.",
  "significance": "high",
  "media": [],
  "links": [
    { "label": "Projektartikel 2018", "url": "https://lordovervolt.com/embroidery/1" },
    { "label": "GitHub-Spiegel", "url": "https://github.com/openembroidery/embroiderino" }
  ],
  "connections": ["arduino-2005", "embroidermodder-2013", "inkstitch-2017", "turtlestitch-2016"],
  "tags": ["Stickmaschine", "DIY", "Arduino", "3D-Druck", "Open Hardware"],
  "source": "markol, \"Embroiderino towards open source embroidery\", 2018; GitHub openembroidery/embroiderino (Spiegel, 2024)"
}
```

### 4. knitout

```json
{
  "id": "knitout-2017",
  "year": 2017,
  "track": "B",
  "title": "knitout",
  "subtitle": "Offenes Dateiformat fuer maschinelles Stricken",
  "description": "Knitout ist ein maschinenunabhaengiges Dateiformat fuer niederstufige Strickbefehle. Entwickelt im Umfeld des Carnegie Mellon Textiles Lab, trennt es Strickprogramme von einzelnen Maschinenmodellen und proprietaeren Softwareketten. Damit ist knitout weniger eine Maschine als ein offener Standard, der Interoperabilitaet im digitalen Stricken ermoeglicht.",
  "significance": "medium",
  "media": [],
  "links": [
    { "label": "Spezifikation", "url": "https://textiles-lab.github.io/knitout/knitout.html" },
    { "label": "GitHub", "url": "https://github.com/textiles-lab/knitout" }
  ],
  "connections": ["knitic-2012", "openknit-2014", "kniterate-2015"],
  "tags": ["Dateiformat", "Standard", "Maschinenstricken", "Open Source", "Interoperabilitaet"],
  "source": "textiles-lab/knitout auf GitHub, erstellt 2017"
}
```

### 5. PEmbroider

```json
{
  "id": "pembroider-2020",
  "year": 2020,
  "track": "B",
  "title": "PEmbroider",
  "subtitle": "Creative-Coding-Bibliothek fuer generative Stickerei",
  "description": "PEmbroider ist eine offene Bibliothek fuer computergestuetzte Stickerei in Processing. Sie richtet sich explizit an Kunst, Bildung, Making und Schulen und verbindet Stickausgabe mit generativer Gestaltung, Typografie und Interaktion. Fuer StitchTexTech ist PEmbroider vor allem dort interessant, wo offene Textiltechnik mit Computational Thinking zusammentrifft.",
  "significance": "medium",
  "media": [],
  "links": [
    { "label": "GitHub", "url": "https://github.com/CreativeInquiry/PEmbroider" }
  ],
  "connections": ["turtlestitch-2016", "inkstitch-2017", "embroidermodder-2013"],
  "tags": ["Stickerei", "Processing", "Creative Coding", "Bildung", "Generativ"],
  "source": "CreativeInquiry/PEmbroider auf GitHub, erstellt 2020; GPL v3 + ACSL 1.4"
}
```

## Einordnung nach Subfeldern

- Offene Steuerung alter Strickmaschinen: `AYAB`, `Knitic`, `TwitterKnitter`
- Vollstaendig oder weitgehend neu gebaute Maschinen: `OpenKnit`, `Circular Knitic`, `Embroiderino`
- Offene Stick-Software als Infrastruktur: `Embroidermodder`, `Ink/Stitch`
- Offene Formate und Programmierschnittstellen: `knitout`, optional spaeter `libembroidery`
- Bildung / Coding / textile Interfaces: `TurtleStitch`, `PEmbroider`

## Offene Punkte

- `⚠️ LIZENZ PRUEFEN:` OpenKnit-Repo `g3rard/OpenKnit` hat aktuell keine SPDX-Lizenz im GitHub-Metadatensatz.
- `⚠️ LIZENZ PRUEFEN:` Fuer Medien zu `TwitterKnitter` und `Embroiderino` existieren gute Projektbilder, aber deren direkte Wiederverwendung sollte pro Datei geprueft werden.
- `Circular Knitic` ist im aktuellen Datensatz mit `2013` codiert. Die belastbaren oeffentlichen Repo-/Projektspuren liegen eher bei `2014`. Vor einer ID-Aenderung muessten die bestehenden `connections` migriert werden.
