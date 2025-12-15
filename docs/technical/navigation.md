# Navigation

## Navigation Buttons

Use `data-sv-nav` attribute on buttons for navigation:

```html
<button class="sv-btn" type="button" data-sv-nav="prev">Previous</button>
<button class="sv-btn sv-btn-primary" type="button" data-sv-nav="next">Next</button>
<button class="sv-btn" type="button" data-sv-nav="first">Back to Start</button>
<button class="sv-btn" type="button" data-sv-nav="last">Go to End</button>
```

### Available Actions

| Value | Action |
|-------|--------|
| `next` | Go to next slide |
| `prev` | Go to previous slide |
| `first` | Jump to first slide |
| `last` | Jump to last slide |

## Jump Links

Use `data-sv-scroll-to` to jump to a specific slide by ID:

```html
<button class="sv-btn" type="button" data-sv-scroll-to="slide-abc123">
  Go to Specific Slide
</button>
```

The target must match a `data-slide-id` value.

## Keyboard Navigation

Reveal.js handles keyboard navigation when `keyboard: true`:

| Key | Action |
|-----|--------|
| `→` / `Space` / `Page Down` | Next slide |
| `←` / `Page Up` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |

## Programmatic Navigation

Access navigation via the runtime:

```javascript
// Initialize and store reference
const deck = window.SlideVibing.init({ ... });

// Navigate to slide by ID
deck.scrollToId('slide-abc123');

// Get current slide
const currentId = deck.getActiveSurfaceId();
```

## URL Hash Navigation

With `hash: true` in Reveal.js config, the URL updates as you navigate:

```
https://example.com/slides#/2  → Third slide (0-indexed)
```

Users can bookmark or share links to specific slides.

## Navigation Patterns

### Standard Prev/Next

```html
<div class="mt-8 flex gap-3">
  <button class="sv-btn" type="button" data-sv-nav="prev">Prev</button>
  <button class="sv-btn sv-btn-primary" type="button" data-sv-nav="next">Next</button>
</div>
```

### Cover Slide (Start Button)

```html
<div class="mt-8 flex gap-3">
  <button class="sv-btn sv-btn-primary" type="button" data-sv-nav="next">Start</button>
  <button class="sv-btn" type="button" data-sv-scroll-to="slide-conclusion">Skip to End</button>
</div>
```

### Final Slide (Back to Start)

```html
<div class="mt-8 flex gap-3">
  <button class="sv-btn" type="button" data-sv-nav="prev">Prev</button>
  <button class="sv-btn" type="button" data-sv-nav="first">Back to Start</button>
</div>
```

### Table of Contents Links

```html
<ul class="space-y-2">
  <li><button class="sv-btn" data-sv-scroll-to="slide-intro">Introduction</button></li>
  <li><button class="sv-btn" data-sv-scroll-to="slide-analysis">Analysis</button></li>
  <li><button class="sv-btn" data-sv-scroll-to="slide-conclusion">Conclusion</button></li>
</ul>
```
