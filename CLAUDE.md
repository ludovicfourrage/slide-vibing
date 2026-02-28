# CLAUDE.md

## Project Overview

**Slide-Vibing** is a no-build slide presentation runtime built on Reveal.js with scroll-based navigation. Three files make up the entire project:

- `index.html` — Demo slide deck and configuration template
- `slides-runtime.js` — Self-contained runtime (~1900 lines) with reactive state, comments, PDF export, canvas animations
- `slides-runtime.css` — All UI styling (overlays, markers, panels, modals)

There is no build step, no package.json, no bundler. Everything runs from static files via CDN dependencies.

## Development

Serve statically and open in a browser:
```bash
npx serve .
# or: python -m http.server
# or: open index.html directly
```

To verify changes work: open the demo deck, scroll through all 5 slides, test commenting (select text), test the canvas animation (click to play/pause), and confirm the PDF button unlocks on the final slide.

## Architecture

### Reactive Core

The runtime uses a fine-grained reactive system inspired by SolidJS (`createSignal`, `createMemo`, `createEffect`, `batch`, `untrack`). See `slides-runtime.js:1-130` for the implementation. All state flows through signals — do not introduce external state management.

### Subsystems

All subsystems are initialized via `SlideVibing.init()` in a specific order. See `slides-runtime.js:1841-1922` for the initialization flow.

| Subsystem | Init function | Purpose |
|-----------|--------------|---------|
| Navigation | `initNav` | `data-sv-nav` buttons (next/prev/first/last) and `data-sv-scroll-to` links |
| Numbering | `initNumbering` | Populates `[data-sv-slide-index]` / `[data-sv-slide-total]`, excludes covers |
| PDF Export | `initPdf` | Gated download unlocked on last slide, uses `?print-pdf` mode |
| Comments | `initComments` | Text-selection-anchored comments with local or Power Automate storage |
| Canvas | `initCanvasControllers` | Per-slide animated canvases with play/pause on click |

### Comment System

The comment subsystem (~1200 lines) is the most complex part. It handles:
- Text selection anchoring with percentage-based coordinates
- Draggable markers, inline bubbles, and a side panel
- Two storage backends: localStorage (`type: 'local'`) and Power Automate HTTP API
- Optimistic updates, conflict detection via hashing, and offline resilience

Storage key format: `sv:comments:{deckId}` for local mode.

### Public API

```javascript
window.SlideVibing = {
  version: '1.0.6',
  init(config),               // Main entry point — returns { getActiveSurfaceId(), scrollToId() }
  generateCuid(),             // 9-char alphanumeric ID
  generateSlideId(),          // Returns "slide-{cuid}"
  state: { createSignal, createMemo, createEffect, batch, untrack }
}
```

## Coding Conventions

**These rules are strict — follow them in all changes:**

- All CSS classes use the `sv-` prefix (e.g., `sv-btn`, `sv-panel`, `sv-marker`)
- Element IDs follow `sv{ComponentName}` pattern (e.g., `svCommentPanel`, `svNameModal`)
- CSS custom properties use `--sv-` prefix (e.g., `--sv-indigo`, `--sv-border`)
- The runtime is a single IIFE — do not split it into modules or add imports
- Use `data-slide-id` for stable slide identifiers (generate with `SlideVibing.generateSlideId()`)
- Use `data-slide-kind="cover"` to exclude slides from numbering
- Navigation uses `data-sv-nav` and `data-sv-scroll-to` attributes, not click handlers

## Slide HTML Structure

```html
<section data-slide-kind="cover">
  <div class="sv-slide-surface"
       data-slide-id="slide-{cuid}"
       data-slide-title="Title">
    <!-- slide content -->
  </div>
</section>
```

The outer `<section>` is a Reveal.js slide. The inner `.sv-slide-surface` is what Slide-Vibing operates on.

## Reveal.js Configuration

Reveal.js must be configured with `view: 'scroll'`, `scrollSnap: 'mandatory'`, and `disableLayout: true`. See `index.html:448-492` for the full configuration. Do not change these settings without understanding the scroll-based navigation model.

## CDN Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Reveal.js | 5.2.1 | Scroll-view presentation engine |
| Tailwind CSS | CDN (v3) | Utility-first slide styling |
| Google Fonts (Inter) | latest | Typography |

The runtime itself (`slides-runtime.js` + `slides-runtime.css`) is also distributed via jsDelivr from this repo's tags.

## Common Gotchas

- **Marker positioning is percentage-based.** Comment markers store `markerX`/`markerY` as viewport percentages, not pixels. Always use `getSurfaceRect()` to convert.
- **Print mode hides all UI.** The `@media print` rule in the CSS hides overlays, panels, and markers. Don't rely on them being visible during PDF export.
- **Scroll behavior varies.** `scrollIntoView({ behavior: 'smooth', block: 'center' })` is used for navigation but Reveal.js may override scroll behavior. Test on multiple browsers.
- **The IIFE pattern means no exports.** Everything attaches to `window.SlideVibing`. Don't try to import from the runtime.
- **Cover slides are special.** `data-slide-kind="cover"` sections are excluded from numbering and from "first slide" navigation. The PDF unlock triggers on the last *numbered* slide.

## Claude Code Skills & Agents

This project uses specialized Claude Code skills and sub-agents:

| Name | Type | Purpose |
|------|------|---------|
| `slide-developer` | Skill + Agent (Sonnet) | Slide HTML/CSS creation, canvas animations, runtime API |
| `business-consultant` | Skill + Agent (Opus) | Strategic frameworks, executive communication, narrative structure |

Agents are invoked automatically based on task context or explicitly via "use the {agent-name} agent".

## MCP Documentation Server

The `.mcp.json` configures a Filesystem MCP server that serves `./docs/` for reference documentation. Use the `mcp__slide-vibing-docs__*` tools to read docs when available.
