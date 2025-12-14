---
name: slide-developer
description: Slide development expertise for Slide-Vibing/Reveal.js presentations. Use when creating slides, modifying slide structure, adding animations, configuring comments, or working with the slides-runtime.js API.
---

# Slide Developer

Technical expertise for building presentations with the Slide-Vibing runtime on Reveal.js.

## Slide Structure

### Basic Slide Template
```html
<section class="bg-slate-50" style="min-height:100vh;">
  <div class="sv2-slide-surface bg-white border border-slate-200 rounded-2xl shadow-xl p-10 max-w-[900px]"
       data-slide-id="slide-{cuid}"
       data-slide-title="Slide Title">
    <!-- Content here -->
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-slate-800">Title</h2>
      <div class="text-xs text-slate-500">
        <span data-sv2-slide-index></span> / <span data-sv2-slide-total></span>
      </div>
    </div>
    <p class="mt-4 text-slate-600">Content...</p>

    <!-- Navigation -->
    <div class="mt-8 flex gap-3">
      <button class="sv2-btn" type="button" data-sv2-nav="prev">Prev</button>
      <button class="sv2-btn sv2-btn-primary" type="button" data-sv2-nav="next">Next</button>
    </div>
  </div>
</section>
```

### Cover Slide (Excluded from Numbering)
```html
<section data-slide-kind="cover" class="bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100">
  <!-- Cover content -->
</section>
```

### Generate Slide IDs
Use `SlidesV2.generateSlideId()` in browser console or create CUIDs matching pattern: `slide-c{random}`

## Navigation Attributes

| Attribute | Values | Purpose |
|-----------|--------|---------|
| `data-sv2-nav` | `next`, `prev`, `first`, `last` | Navigation buttons |
| `data-sv2-scroll-to` | `slide-{id}` | Jump to specific slide |

## Canvas Animations

```javascript
canvas: {
  controllers: [
    {
      canvasId: 'myCanvas',
      slideId: 'slide-xxx',
      draw({ ctx, width, height, t, isPlaying }) {
        ctx.clearRect(0, 0, width, height);
        // Animation logic using t (elapsed ms)
      }
    }
  ]
}
```

- Click canvas to play/pause
- `t` resets when navigating away from slide
- `isPlaying` indicates current state

## Comment Configuration

### Local Storage (Default)
```javascript
comments: {
  enabled: true,
  storage: { type: 'local' }
}
```

### Power Automate Backend
```javascript
comments: {
  enabled: true,
  storage: {
    type: 'powerAutomate',
    requireBackend: true,
    apiKey: '<X-Api-Key>',
    readUrl: '<URL>',
    writeUrl: '<URL>',
    updateUrl: '<URL>',
    deleteUrl: '<URL>'
  }
}
```

## PDF Export

```javascript
pdf: {
  buttonId: 'sv2DownloadPdfBtn',
  unlockKey: 'sv2DeckCompleted',
  unlockOnLastSlide: true
}
```

- Button hidden until user reaches final slide
- Uses `?print-pdf` query parameter for print mode

## Reactive State API

```javascript
const { createSignal, createMemo, createEffect, batch } = SlidesV2.state;

const [value, setValue] = createSignal(initial);
const derived = createMemo(() => compute(value()));
createEffect(() => react(value()));
batch(() => { /* multiple updates */ });
```

## CSS Classes

| Class | Purpose |
|-------|---------|
| `sv2-slide-surface` | Main slide content container |
| `sv2-btn` | Base button style |
| `sv2-btn-primary` | Primary action (indigo) |
| `sv2-btn-secondary` | Secondary action (gray) |
| `sv2-btn-success` | Success action (emerald) |
| `sv2-btn-danger` | Danger action (red) |
| `sv2-hidden` | Hide element |
| `sv2-canvas` | Styled canvas element |

## Tailwind Integration

Tailwind CSS is loaded via CDN. Use utility classes freely:
- Layout: `flex`, `grid`, `items-center`, `justify-between`
- Spacing: `p-10`, `mt-4`, `gap-3`
- Typography: `text-2xl`, `font-bold`, `text-slate-800`
- Backgrounds: `bg-white`, `bg-gradient-to-br`
- Borders: `border`, `rounded-2xl`, `shadow-xl`
