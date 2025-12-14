# API Reference

## SlidesV2.init(config)

Initialize the runtime with configuration options.

```javascript
const deck = SlidesV2.init({
  deckId: 'my-deck',
  selectors: { ... },
  pdf: { ... },
  comments: { ... },
  canvas: { ... }
});
```

### Config Options

#### `deckId` (string, required)
Unique identifier for the deck. Used for localStorage keys.

#### `selectors` (object)
```javascript
selectors: {
  slideSurface: '.sv2-slide-surface'  // Selector for slide content elements
}
```

#### `pdf` (object)
```javascript
pdf: {
  buttonId: 'sv2DownloadPdfBtn',      // Download button element ID
  unlockKey: 'sv2DeckCompleted',       // localStorage key for unlock state
  unlockOnLastSlide: true              // Auto-unlock on final slide
}
```

#### `comments` (object)
```javascript
comments: {
  enabled: true,
  storage: {
    type: 'local',                     // 'local' or 'powerAutomate'
    // Power Automate options:
    requireBackend: false,
    apiKey: '',
    readUrl: '',
    writeUrl: '',
    updateUrl: '',
    deleteUrl: '',
    pollIntervalMs: 1000,
    errorAfter: 3,
    fallbackAfter: 10
  },
  ui: {
    toggleId: 'sv2CommentToggle',
    countId: 'sv2CommentCount',
    // ... see comments.md for full list
  }
}
```

#### `canvas` (object)
```javascript
canvas: {
  controllers: [
    {
      canvasId: 'myCanvas',            // Canvas element ID
      slideId: 'slide-abc',            // Associated slide ID
      draw({ ctx, width, height, t, isPlaying }) {
        // Animation function
      }
    }
  ]
}
```

### Return Value

```javascript
{
  getActiveSurfaceId(): string,  // Current slide ID
  scrollToId(id: string): void   // Navigate to slide by ID
}
```

---

## SlidesV2.generateSlideId()

Generate a unique slide ID in CUID format.

```javascript
const id = SlidesV2.generateSlideId();
// Returns: "slide-c1a2b3c4d5e6f7..."
```

---

## SlidesV2.generateCuid()

Generate a raw CUID without "slide-" prefix.

```javascript
const cuid = SlidesV2.generateCuid();
// Returns: "c1a2b3c4d5e6f7..."
```

---

## SlidesV2.state

Reactive primitives for custom extensions.

### createSignal(initialValue)

Create a reactive value.

```javascript
const { createSignal } = SlidesV2.state;
const [count, setCount] = createSignal(0);

console.log(count());  // 0
setCount(5);
console.log(count());  // 5
```

### createMemo(fn)

Create a derived value that updates when dependencies change.

```javascript
const { createSignal, createMemo } = SlidesV2.state;
const [count, setCount] = createSignal(2);
const doubled = createMemo(() => count() * 2);

console.log(doubled());  // 4
setCount(5);
console.log(doubled());  // 10
```

### createEffect(fn)

Run side effects when dependencies change.

```javascript
const { createSignal, createEffect } = SlidesV2.state;
const [name, setName] = createSignal('World');

createEffect(() => {
  console.log(`Hello, ${name()}!`);
});
// Logs: "Hello, World!"

setName('Claude');
// Logs: "Hello, Claude!"
```

### batch(fn)

Batch multiple updates to prevent intermediate renders.

```javascript
const { createSignal, batch } = SlidesV2.state;
const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

batch(() => {
  setA(10);
  setB(20);
});
// Effects run once after both updates
```

### untrack(fn)

Read signals without creating dependencies.

```javascript
const { createSignal, createEffect, untrack } = SlidesV2.state;
const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);

createEffect(() => {
  // This effect only depends on 'a', not 'b'
  console.log(a(), untrack(() => b()));
});
```

---

## Data Attributes

### Slide Attributes

| Attribute | Element | Description |
|-----------|---------|-------------|
| `data-slide-id` | `.sv2-slide-surface` | Unique slide identifier |
| `data-slide-title` | `.sv2-slide-surface` | Human-readable title |
| `data-slide-kind` | `<section>` | Set to "cover" to exclude from numbering |

### Navigation Attributes

| Attribute | Value | Description |
|-----------|-------|-------------|
| `data-sv2-nav` | `next` | Go to next slide |
| `data-sv2-nav` | `prev` | Go to previous slide |
| `data-sv2-nav` | `first` | Go to first slide |
| `data-sv2-nav` | `last` | Go to last slide |
| `data-sv2-scroll-to` | `{slide-id}` | Jump to specific slide |

### Numbering Attributes

| Attribute | Description |
|-----------|-------------|
| `data-sv2-slide-index` | Populated with current slide number |
| `data-sv2-slide-total` | Populated with total slide count |

---

## CSS Classes

### Layout

| Class | Description |
|-------|-------------|
| `sv2-slide-surface` | Main slide content container |
| `sv2-ui` | Fixed UI overlay container |
| `sv2-hidden` | Hide element (`display: none`) |

### Buttons

| Class | Description |
|-------|-------------|
| `sv2-btn` | Base button style |
| `sv2-btn-primary` | Primary action (indigo) |
| `sv2-btn-secondary` | Secondary action (gray) |
| `sv2-btn-success` | Success action (emerald) |
| `sv2-btn-danger` | Danger action (red) |

### Comments

| Class | Description |
|-------|-------------|
| `sv2-marker` | Comment marker dot |
| `sv2-marker-resolved` | Resolved comment marker |
| `sv2-marker-has-replies` | Marker with replies |
| `sv2-panel` | Comment panel container |
| `sv2-panel-active` | Visible comment panel |

### Other

| Class | Description |
|-------|-------------|
| `sv2-canvas` | Styled canvas element |
| `sv2-badge` | Count badge |
| `sv2-badge-resolved` | Green resolved badge |
| `sv2-input` | Text input/textarea |
| `sv2-modal` | Modal dialog |

---

## CSS Custom Properties

```css
:root {
  --sv2-indigo: #6366f1;    /* Primary color */
  --sv2-emerald: #10b981;   /* Success color */
  --sv2-amber: #f59e0b;     /* Warning color */
  --sv2-slate: #334155;     /* Text color */
  --sv2-border: #e2e8f0;    /* Border color */
  --sv2-panel: #ffffff;     /* Panel background */
  --sv2-panel-header: #0f172a;  /* Panel header */
}
```
