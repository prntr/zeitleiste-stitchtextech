# vendor/ — lokal ausgelieferte Fremdbibliotheken

Damit die Zeitleiste ohne Internet läuft (Workshop-Hotspot am Pixel 7 Pro,
siehe `~/Code/active/Android/Pixel7Pro/docs/workshop-portal.md`), lädt
`index.html` nichts von CDNs. Alle Pfade sind relativ, dieselben Dateien
funktionieren auf GitHub Pages.

| Datei | Paket | Version | Lizenz |
|-------|-------|---------|--------|
| `d3/d3.min.js` | npm `d3` (`dist/d3.min.js`) | 7.9.0 | ISC, `d3/LICENSE` |
| `fonts/IBMPlexMono-{Regular,SemiBold}.woff2` | npm `@ibm/plex-mono` (`fonts/complete/woff2`) | 2.5.0 | OFL 1.1, `fonts/OFL.txt` |
| `fonts/IBMPlexSans-{Regular,Italic,Medium,SemiBold}.woff2` | npm `@ibm/plex-sans` (`fonts/complete/woff2`) | 1.1.0 | OFL 1.1, `fonts/OFL.txt` |

`fonts/plex.css` deklariert genau diese Schnitte (Mono 400/600, Sans 400/400i/500/600).
Wer in `style.css` oder `main.js` einen neuen Schnitt verwendet, legt die passende
`.woff2` aus demselben Paket dazu und ergänzt `plex.css`.

Aktualisieren: `npm pack d3@<version>` bzw. `npm pack @ibm/plex-sans@<version>`,
entpacken, Dateien ersetzen, Version in dieser Tabelle nachziehen.
