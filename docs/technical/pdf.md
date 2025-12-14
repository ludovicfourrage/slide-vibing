# PDF Export

## Overview

The PDF export feature gates the download button until users reach the final slide, encouraging them to view the entire presentation.

## Configuration

```javascript
SlidesV2.init({
  deckId: 'my-deck',
  pdf: {
    buttonId: 'sv2DownloadPdfBtn',    // ID of download button
    unlockKey: 'sv2DeckCompleted',     // localStorage key for unlock state
    unlockOnLastSlide: true            // Unlock when reaching last slide
  }
});
```

## HTML Setup

Add a hidden download button to your UI:

```html
<div class="sv2-ui">
  <!-- Other UI elements -->
  <button id="sv2DownloadPdfBtn" class="sv2-btn sv2-btn-primary sv2-hidden" type="button">
    Download PDF
  </button>
</div>
```

The `sv2-hidden` class is removed when the user reaches the final slide.

## How It Works

1. Button starts hidden (`sv2-hidden` class)
2. User scrolls through presentation
3. When last slide is reached:
   - `localStorage.setItem(unlockKey, 'true')` is called
   - `sv2-hidden` class is removed from button
4. Clicking button opens `?print-pdf` view
5. Browser print dialog appears for PDF save

## Unlock Persistence

The unlock state persists in localStorage:

```javascript
// Check if unlocked
localStorage.getItem('sv2DeckCompleted') === 'true'

// Manually unlock (for testing)
localStorage.setItem('sv2DeckCompleted', 'true')

// Reset lock
localStorage.removeItem('sv2DeckCompleted')
```

## Custom Unlock Key

Use a namespaced key for multiple decks:

```javascript
pdf: {
  buttonId: 'sv2DownloadPdfBtn',
  unlockKey: 'myCompany:salesDeck:completed',
  unlockOnLastSlide: true
}
```

## Print-PDF Mode

The `?print-pdf` query parameter triggers Reveal.js print mode:

```
https://example.com/slides?print-pdf
```

In this mode:
- All slides render vertically
- Comment UI is hidden
- Browser print dialog auto-opens
- Window closes after print dialog

## Styling the Button

```css
/* Custom PDF button styling */
#sv2DownloadPdfBtn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

#sv2DownloadPdfBtn:disabled {
  opacity: 0.6;
  cursor: wait;
}
```

## Manual PDF Trigger

```javascript
// Open print view programmatically
function openPdfView() {
  const url = new URL(window.location.href);
  url.searchParams.set('print-pdf', '');
  window.open(url.toString(), '_blank');
}
```

## Disabling PDF Gating

To always show the download button:

```javascript
pdf: {
  buttonId: 'sv2DownloadPdfBtn',
  unlockOnLastSlide: false  // Never auto-unlock
}
```

Then manually remove `sv2-hidden` from the button HTML.
