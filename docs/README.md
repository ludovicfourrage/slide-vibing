# Slide-Vibing Documentation

A no-build slide presentation runtime built on Reveal.js with scroll-based navigation, commenting, PDF export gating, and canvas animations.

## Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Presentation</title>

  <!-- Reveal.js CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/theme/white.css">

  <!-- Tailwind (optional) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Slide-Vibing Runtime -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ludovicfourrage/slide-vibing@1.0.1/slides-runtime.css">
</head>
<body>
  <div class="reveal">
    <div class="slides">
      <!-- Your slides here -->
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/ludovicfourrage/slide-vibing@1.0.1/slides-runtime.js"></script>
  <script>
    Reveal.initialize({
      view: 'scroll',
      scrollProgress: true,
      scrollLayout: 'full',
      scrollSnap: 'mandatory',
      controls: false,
      progress: false,
      keyboard: true,
      hash: true,
      touch: true,
      center: true,
      transition: 'none',
      slideNumber: false,
      width: '100%',
      height: '100%',
      margin: 0,
      minScale: 1,
      maxScale: 1,
      disableLayout: true
    });

    window.SlideVibing.init({
      deckId: 'my-deck',
      selectors: {
        slideSurface: '.sv-slide-surface'
      },
      pdf: {
        buttonId: 'svDownloadPdfBtn',
        unlockOnLastSlide: true
      },
      comments: {
        enabled: true,
        storage: { type: 'local' }
      }
    });
  </script>
</body>
</html>
```

## Documentation

### [Technical Documentation](./technical/README.md)
Runtime API, configuration, and slide development.

- [Slide Structure](./technical/slides.md) - How to create slides
- [Navigation](./technical/navigation.md) - Navigation buttons and links
- [Comments](./technical/comments.md) - Comment system configuration
- [PDF Export](./technical/pdf.md) - PDF gating and export
- [Canvas Animations](./technical/canvas.md) - Animated canvas controllers
- [API Reference](./technical/api.md) - Full API documentation

### [Business Consulting Guide](./consulting/README.md)
Strategic frameworks and communication patterns for executive presentations.

- [Narrative Structure](./consulting/narrative.md) - Story arcs and slide flow
- [Frameworks](./consulting/frameworks.md) - MECE, pyramid principle, issue trees
- [Headlines](./consulting/headlines.md) - Action-oriented titles
- [Data Visualization](./consulting/data-viz.md) - Charts that communicate insights
- [Recommendations](./consulting/recommendations.md) - Building compelling cases
- [Executive Communication](./consulting/executive.md) - Adapting for senior audiences
