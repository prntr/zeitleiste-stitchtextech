# Agent-Kontrakt -- siehe ~/Code/_std/AGENTS.base.md
# Jedes Projekt kennt dieselben fuenf Ziele, egal in welcher Sprache es geschrieben ist.
.PHONY: setup dev test lint check help
.DEFAULT_GOAL := help

# Statische Website (index.html + main.js + style.css), kein Build-Schritt.
PORT ?= 8080

setup:   ## nichts zu installieren
	@echo "Statische Seite -- kein Build. make dev startet einen lokalen Server."

dev:     ## lokal ausliefern
	@echo "http://localhost:$(PORT)"
	python3 -m http.server $(PORT)

test:    ## keine Testsuite
	@echo "Keine Testsuite. Pruefung: make dev und Zeitleiste im Browser durchgehen."

lint:    ## tote lokale Verweise finden
	@~/Code/_std/bin/check-links .

check: lint  ## Tor vor jedem Commit

help:
	@grep -E '^[a-z][a-z-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  make %-8s %s\n", $$1, $$2}'
