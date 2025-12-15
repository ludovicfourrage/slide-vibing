# Slide Structure

## Basic Slide

Every slide is a `<section>` containing a `.sv-slide-surface` element:

```html
<section class="bg-slate-50" style="min-height:100vh;">
  <div class="sv-slide-surface bg-white border border-slate-200 rounded-2xl shadow-xl p-10 max-w-[900px]"
       data-slide-id="slide-abc123"
       data-slide-title="My Slide Title">

    <!-- Header with title and numbering -->
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-slate-800">Slide Title</h2>
      <div class="text-xs text-slate-500">
        <span data-sv-slide-index></span> / <span data-sv-slide-total></span>
      </div>
    </div>

    <!-- Content -->
    <p class="mt-4 text-slate-600">Your slide content here...</p>

    <!-- Navigation buttons -->
    <div class="mt-8 flex gap-3">
      <button class="sv-btn" type="button" data-sv-nav="prev">Prev</button>
      <button class="sv-btn sv-btn-primary" type="button" data-sv-nav="next">Next</button>
    </div>
  </div>
</section>
```

## Required Attributes

### `data-slide-id`
A stable, unique identifier for the slide. Use CUID format for consistency:

```javascript
// Generate in browser console
SlideVibing.generateSlideId()  // Returns: "slide-c1a2b3c4d5..."
```

Pattern: `slide-c{random alphanumeric}`

### `data-slide-title`
Human-readable title used in comment panels and navigation.

## Slide Numbering

Add these spans to display current position:

```html
<span data-sv-slide-index></span> / <span data-sv-slide-total></span>
```

The runtime automatically populates these values, excluding cover slides from the count.

## Cover Slides

Cover slides are excluded from numbering. Add `data-slide-kind="cover"` to the `<section>`:

```html
<section data-slide-kind="cover" class="bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100" style="min-height:100vh;">
  <div class="sv-slide-surface ..."
       data-slide-id="slide-cover"
       data-slide-title="Cover">
    <h1>Presentation Title</h1>
    <!-- Cover content -->
  </div>
</section>
```

## Styling

### CSS Classes

| Class | Purpose |
|-------|---------|
| `sv-slide-surface` | Main content container (required) |
| `sv-btn` | Base button style |
| `sv-btn-primary` | Primary action (indigo) |
| `sv-btn-secondary` | Secondary action (gray) |
| `sv-hidden` | Hide element |

### Recommended Layout

```html
<div class="sv-slide-surface bg-white border border-slate-200 rounded-2xl shadow-xl p-10 max-w-[900px]">
```

- `max-w-[900px]` - Constrains content width
- `p-10` - Comfortable padding
- `rounded-2xl shadow-xl` - Card-like appearance

### Tailwind Integration

Tailwind CSS is loaded via CDN. Common utilities:

```html
<!-- Layout -->
<div class="flex items-center justify-between gap-3">

<!-- Typography -->
<h2 class="text-2xl font-bold text-slate-800">
<p class="text-slate-600">

<!-- Spacing -->
<div class="mt-4 mb-8 p-10">

<!-- Colors -->
<div class="bg-white text-slate-800 border-slate-200">
```

## Multiple Slides Example

```html
<div class="reveal">
  <div class="slides">
    <!-- Cover (not numbered) -->
    <section data-slide-kind="cover">
      <div class="sv-slide-surface" data-slide-id="slide-cover" data-slide-title="Cover">
        <h1>My Presentation</h1>
      </div>
    </section>

    <!-- Slide 1 -->
    <section>
      <div class="sv-slide-surface" data-slide-id="slide-intro" data-slide-title="Introduction">
        <h2>Introduction</h2>
        <p>First numbered slide...</p>
      </div>
    </section>

    <!-- Slide 2 -->
    <section>
      <div class="sv-slide-surface" data-slide-id="slide-main" data-slide-title="Main Content">
        <h2>Main Content</h2>
        <p>Second numbered slide...</p>
      </div>
    </section>
  </div>
</div>
```
