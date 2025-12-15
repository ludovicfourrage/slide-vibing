# API Reference

## SlideVibing.init(config)

Initialize the runtime with configuration options.

```javascript
const deck = SlideVibing.init({
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
  slideSurface: '.sv-slide-surface'  // Selector for slide content elements
}
```

#### `pdf` (object)
```javascript
pdf: {
  buttonId: 'svDownloadPdfBtn',      // Download button element ID
  unlockKey: 'svDeckCompleted',       // localStorage key for unlock state
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
    toggleId: 'svCommentToggle',
    countId: 'svCommentCount',
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

## SlideVibing.generateSlideId()

Generate a unique slide ID in CUID format.

```javascript
const id = SlideVibing.generateSlideId();
// Returns: "slide-c1a2b3c4d5e6f7..."
```

---

## SlideVibing.generateCuid()

Generate a raw CUID without "slide-" prefix.

```javascript
const cuid = SlideVibing.generateCuid();
// Returns: "c1a2b3c4d5e6f7..."
```

---

## SlideVibing.state

Reactive primitives for custom extensions.

### createSignal(initialValue)

Create a reactive value.

```javascript
const { createSignal } = SlideVibing.state;
const [count, setCount] = createSignal(0);

console.log(count());  // 0
setCount(5);
console.log(count());  // 5
```

### createMemo(fn)

Create a derived value that updates when dependencies change.

```javascript
const { createSignal, createMemo } = SlideVibing.state;
const [count, setCount] = createSignal(2);
const doubled = createMemo(() => count() * 2);

console.log(doubled());  // 4
setCount(5);
console.log(doubled());  // 10
```

### createEffect(fn)

Run side effects when dependencies change.

```javascript
const { createSignal, createEffect } = SlideVibing.state;
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
const { createSignal, batch } = SlideVibing.state;
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
const { createSignal, createEffect, untrack } = SlideVibing.state;
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
| `data-slide-id` | `.sv-slide-surface` | Unique slide identifier |
| `data-slide-title` | `.sv-slide-surface` | Human-readable title |
| `data-slide-kind` | `<section>` | Set to "cover" to exclude from numbering |

### Navigation Attributes

| Attribute | Value | Description |
|-----------|-------|-------------|
| `data-sv-nav` | `next` | Go to next slide |
| `data-sv-nav` | `prev` | Go to previous slide |
| `data-sv-nav` | `first` | Go to first slide |
| `data-sv-nav` | `last` | Go to last slide |
| `data-sv-scroll-to` | `{slide-id}` | Jump to specific slide |

### Numbering Attributes

| Attribute | Description |
|-----------|-------------|
| `data-sv-slide-index` | Populated with current slide number |
| `data-sv-slide-total` | Populated with total slide count |

---

## CSS Classes

### Layout

| Class | Description |
|-------|-------------|
| `sv-slide-surface` | Main slide content container |
| `sv-ui` | Fixed UI overlay container |
| `sv-hidden` | Hide element (`display: none`) |

### Buttons

| Class | Description |
|-------|-------------|
| `sv-btn` | Base button style |
| `sv-btn-primary` | Primary action (indigo) |
| `sv-btn-secondary` | Secondary action (gray) |
| `sv-btn-success` | Success action (emerald) |
| `sv-btn-danger` | Danger action (red) |

### Comments

| Class | Description |
|-------|-------------|
| `sv-marker` | Comment marker dot |
| `sv-marker-resolved` | Resolved comment marker |
| `sv-marker-has-replies` | Marker with replies |
| `sv-panel` | Comment panel container |
| `sv-panel-active` | Visible comment panel |

### Other

| Class | Description |
|-------|-------------|
| `sv-canvas` | Styled canvas element |
| `sv-badge` | Count badge |
| `sv-badge-resolved` | Green resolved badge |
| `sv-input` | Text input/textarea |
| `sv-modal` | Modal dialog |

---

## CSS Custom Properties

```css
:root {
  --sv-indigo: #6366f1;    /* Primary color */
  --sv-emerald: #10b981;   /* Success color */
  --sv-amber: #f59e0b;     /* Warning color */
  --sv-slate: #334155;     /* Text color */
  --sv-border: #e2e8f0;    /* Border color */
  --sv-panel: #ffffff;     /* Panel background */
  --sv-panel-header: #0f172a;  /* Panel header */
}
```
