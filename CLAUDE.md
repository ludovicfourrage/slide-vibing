# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Slide-Vibing**, a no-build slide presentation runtime built on Reveal.js with scroll-based navigation. It provides commenting, PDF export gating, and canvas animations without requiring any build tools.

## Development

This is a static web project with no build step. To run locally:
- Open `index.html` directly in a browser, or
- Use any static file server (e.g., `npx serve`, `python -m http.server`)

## Architecture

### Core Files

- **index.html** - Slide deck template using Reveal.js scroll view with `SlideVibing.init()` configuration
- **slides-runtime.js** - Self-contained runtime (~1900 lines) with reactive state system
- **slides-runtime.css** - Styling for UI overlay, comment markers, panels, and modals

### Runtime Components (`slides-runtime.js`)

The runtime uses a **fine-grained reactive system** (signals/memos/effects) inspired by SolidJS:

```javascript
const [value, setValue] = createSignal(initialValue);
const derived = createMemo(() => computeFrom(value()));
createEffect(() => reactTo(value()));
```

Key subsystems initialized via `SlideVibing.init()`:

1. **Navigation** (`initNav`) - Handles `data-sv-nav` buttons (next/prev/first/last) and `data-sv-scroll-to` links
2. **Numbering** (`initNumbering`) - Populates `[data-sv-slide-index]` and `[data-sv-slide-total]` spans, excluding cover slides
3. **PDF Export** (`initPdf`) - Gated download button unlocked on reaching final slide, uses `?print-pdf` mode
4. **Comments** (`initComments`) - Text selection creates anchored comments, supports local storage or Power Automate backend
5. **Canvas Controllers** (`initCanvasControllers`) - Per-slide animated canvases with play/pause on click

### Slide Structure

Slides are `<section>` elements containing a `.sv-slide-surface` with:
- `data-slide-id` - Stable CUID (use `SlideVibing.generateSlideId()`)
- `data-slide-title` - Human-readable title
- `data-slide-kind="cover"` - Excludes slide from numbering

### Comment Storage

Comments can use:
- **Local mode** (`storage: { type: 'local' }`) - localStorage with `sv:comments:{deckId}` key
- **Power Automate mode** - Requires `readUrl`, `writeUrl`, `updateUrl`, `deleteUrl`, and `apiKey`

The system includes optimistic updates, conflict detection, and pending change tracking for offline resilience.

### Key Patterns

- All UI elements use `sv-` CSS class prefix
- Element IDs follow `sv{ComponentName}` pattern (e.g., `svCommentPanel`)
- Comment markers are draggable and store position as percentage coordinates
- Reveal.js configured with `view: 'scroll'`, `scrollSnap: 'mandatory'`, `disableLayout: true`

## Claude Code Skills & Agents

This project includes specialized Skills and Sub-Agents for slide development.

### Skills (`.claude/skills/`)

| Skill | Purpose |
|-------|---------|
| `business-consultant` | Strategic frameworks (MECE, pyramid principle), executive communication, recommendation structure |
| `slide-developer` | Technical slide creation, canvas animations, runtime API reference |

### Sub-Agents (`.claude/agents/`)

| Agent | Model | Purpose |
|-------|-------|---------|
| `business-consultant` | Opus | Strategic narrative review, framework application, executive-level content guidance |
| `slide-developer` | Sonnet | Slide HTML/CSS creation, animation development, runtime configuration |

Agents are invoked automatically based on task context or explicitly via "use the {agent-name} agent"

## MCP Server

The project includes an MCP server configuration (`.mcp.json`) that serves library documentation via the Filesystem MCP server. External users can access docs through any MCP-compatible client.

### Documentation (`docs/`)

**Technical Documentation** (`docs/technical/`)
| File | Content |
|------|---------|
| `slides.md` | Slide structure and attributes |
| `navigation.md` | Navigation buttons and links |
| `comments.md` | Comment system configuration |
| `pdf.md` | PDF export and gating |
| `canvas.md` | Canvas animation controllers |
| `api.md` | Full API reference |

**Business Consulting Guide** (`docs/consulting/`)
| File | Content |
|------|---------|
| `narrative.md` | Story arcs, SCR framework, slide flow |
| `frameworks.md` | MECE, pyramid principle, issue trees, Porter's Five Forces |
| `headlines.md` | Action-oriented titles, headline formulas |
| `data-viz.md` | Chart selection, data-ink ratio, annotations |
| `recommendations.md` | Building cases, quantifying impact |
| `executive.md` | C-suite communication, pre-wiring, executive briefs |

### Using the MCP Server

```bash
# Install and run the docs server
npx -y @modelcontextprotocol/server-filesystem ./docs
```

Or configure in your MCP client using the `.mcp.json` file
