# Mitmachen — StitchTexTech Zeitleiste

Willkommen! Diese Anleitung erklärt, wie du neue Ereignisse beisteuern oder bestehende verbessern kannst — egal ob du mit KI-Unterstützung oder ohne arbeitest.

---

## Voraussetzungen

- GitHub-Account
- Git (oder GitHub Desktop für grafische Oberfläche)
- Texteditor (VS Code empfohlen)
- Für KI-Agenten: lies zuerst vollständig **[AGENTS.md](AGENTS.md)**

---

## Workflow (Fork → Branch → PR)

### 1. Repo forken

Klicke oben rechts auf **Fork** — das erstellt deine eigene Kopie des Repos.

### 2. Lokal klonen

```bash
git clone https://github.com/DEIN-USERNAME/zeitleiste-stitchtextech.git
cd zeitleiste-stitchtextech
```

### 3. Branch anlegen

```bash
git checkout -b ereignis/reprap-2005
```

Namenskonvention: `ereignis/KURZNAME` oder `fix/BESCHREIBUNG`

### 4. Lokalen Server starten

```bash
python3 -m http.server
```

App läuft auf `http://localhost:8000`

### 5. Änderungen machen

Neue Ereignisse kommen in `data/timeline.json` → Array `events`.

### 6. Commit + Push

```bash
git add data/timeline.json
git commit -m "Add: RepRap-Projekt 2005 (Track B)"
git push origin ereignis/reprap-2005
```

### 7. Pull Request öffnen

Auf github.com → **"Compare & pull request"** → kurze Beschreibung → absenden.

---

## Neues Ereignis hinzufügen

Minimal-Beispiel für `data/timeline.json`:

```json
{
  "id": "reprap-2005",
  "year": 2005,
  "track": "B",
  "title": "RepRap-Projekt gegründet",
  "description": "Adrian Bowyer gründet das RepRap-Projekt an der Universität Bath. Ziel: ein 3D-Drucker, der Teile für sich selbst drucken kann.",
  "significance": "landmark",
  "media": [
    {
      "type": "image",
      "url": "https://upload.wikimedia.org/...",
      "caption": "Erster RepRap-Prototyp",
      "license": "CC BY-SA 3.0",
      "author": "Adrian Bowyer",
      "source": "Wikimedia Commons"
    }
  ],
  "connections": ["arduino-2005"],
  "links": [
    { "label": "reprap.org", "url": "https://reprap.org" }
  ],
  "source": "Bowyer 2007"
}
```

Vollständiges Schema und alle Regeln: **[AGENTS.md → Daten-Schema](AGENTS.md)**

---

## Regeln (Kurzfassung)

- `id`: kebab-case + Jahr, z.B. `singer-1851`
- `description`: eigene Formulierungen, keine Wikipedia-Kopien
- Bilder: nur freie Lizenzen (CC, Public Domain) — Quelle immer angeben
- Videos: immer `youtube-nocookie.com/embed/VIDEO_ID`
- `connections`: nur IDs, die in der Datei existieren
- `significance: "landmark"` — max. 5 pro Track

---

## Mit KI-Agenten arbeiten (Claude Code, Cursor, Copilot)

Das Repo enthält `AGENTS.md` — eine maschinenlesbare Projektbeschreibung. KI-Agenten lesen diese Datei automatisch und kennen damit:

- den vollständigen Tech-Stack
- das Datenschema
- alle Quellenregeln und Verbote
- häufige Fehler

**Typischer Prompt für einen Agenten:**

> Lies AGENTS.md. Füge ein neues Ereignis für [THEMA, JAHR, TRACK] hinzu. Recherchiere ein freies Bild auf Wikimedia Commons. Halte dich strikt an das Schema und die Quellenregeln.

Der Agent schreibt den JSON-Eintrag, du prüfst ihn und stellst einen Pull Request.

---

## Checkliste vor dem Pull Request

- [ ] `id` ist eindeutig und existiert noch nicht
- [ ] `description` ist selbst formuliert (kein Copy-Paste aus Wikipedia)
- [ ] Bild-URL liefert 200 OK und hat freie Lizenz dokumentiert
- [ ] Video-URL verwendet `youtube-nocookie.com/embed/`
- [ ] Alle `connections`-IDs existieren in der Datei
- [ ] App lokal getestet — kein JavaScript-Fehler in der Konsole
- [ ] Multi-Track und Kompakt-Modus funktionieren

---

## Fragen?

Issue öffnen oder direkt Bescheid geben.
