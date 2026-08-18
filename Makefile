# Makefile for the @gad-lang JS editor plugin.
# Thin wrapper over the bun scripts in package.json.
BUN ?= bun

.DEFAULT_GOAL := help

## help: list the available targets
.PHONY: help
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## /  /'

## install: install dependencies
.PHONY: install
install:
	$(BUN) install

## build: compile TypeScript into dist/
.PHONY: build
build: install
	$(BUN) run build

## typecheck: type-check without emitting
.PHONY: typecheck
typecheck: install
	$(BUN) run typecheck

## demo: serve the example (http://localhost:3000)
.PHONY: demo
demo: install
	$(BUN) run demo

## clean: remove the build output
.PHONY: clean
clean:
	$(BUN) run clean
