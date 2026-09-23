# StitchTexTech — Stand und offene Aufgaben

Aus `AGENTS.md` ausgelagert am 2026-09-23.

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
