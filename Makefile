# Agent-Kontrakt -- siehe ~/Code/_std/AGENTS.base.md
# Jedes Projekt kennt dieselben fuenf Ziele, egal in welcher Sprache es geschrieben ist.
.PHONY: setup dev test lint check help ui-debt ui-kit-sync
.DEFAULT_GOAL := help

# Statische Website (index.html + main.js + style.css), kein Build-Schritt.
PORT ?= 8080

setup:   ## nichts zu installieren
	@echo "Statische Seite -- kein Build. make dev startet einen lokalen Server."

dev:     ## lokal ausliefern
	@echo "http://localhost:$(PORT)"
	uv run --no-project python -m http.server $(PORT) --bind 127.0.0.1

test:    ## keine Testsuite
	@echo "Keine Testsuite. Pruefung: make dev und Zeitleiste im Browser durchgehen."

# UI-Gate aus ui-kit (Kopie, siehe ui-kit.lock.json): lang, Fokus-Umrisse und
# Farbliterale, gegen ui-debt.json. Nur Python-Standardbibliothek, kein Build.
UI_LINT = uv run --no-project python tools/ui-kit/ui_lint.py index.html style.css lv-tools
UI_KIT ?= $(HOME)/Code/active/ui-kit

lint:    ## tote lokale Verweise finden; UI-Gate (lang, Fokus, Farbliterale)
	@~/Code/_std/bin/check-links .
	$(UI_LINT)

ui-debt: ## UI-Schuldenliste auf den Ist-Stand senken (nie erhoehen)
	$(UI_LINT) --update

ui-kit-sync: ## Gate-Kopien aus ui-kit neu uebernehmen: make ui-kit-sync UI_KIT=...
	node $(UI_KIT)/gates/ui-kit-copy.mjs sync $(UI_KIT)

check: lint  ## Tor vor jedem Commit

help:
	@grep -E '^[a-z][a-z-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  make %-8s %s\n", $$1, $$2}'
