# Border Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Steps use checkbox syntax.

**Goal:** Align border stroke styles with Lucky, improve HTML clipboard borders, draw from `borderInfo` at paint time with insert/delete shifting, and make `border-none` clear neighbor opposite edges.

**Architecture:** Keep `cell.bd` for clipboard/format-brush; add `computeBorderInfoMap` as the paint source of truth (same as Lucky `getBorderInfoCompute`). Shift `config.borderInfo` on row/col insert/delete then rematerialize `bd`. Stroke via shared `borderLineStroke` + Double/Medium path offsets.

**Tech Stack:** TypeScript, Vitest, Canvas 2D, existing `@luckysheet3/core`.

## Tasks

1. Stroke styles (Double + Medium ±0.5) — TDD in `border-line-stroke` / renderer helpers
2. HTML clipboard export per-side CSS borders — TDD in `clipboard.spec.ts`
3. `computeBorderInfoMap` + paint uses it; `shiftBorderInfo` on sheet insert/delete; rematerialize bd
4. `border-none` clears neighbor opposite sides

---
