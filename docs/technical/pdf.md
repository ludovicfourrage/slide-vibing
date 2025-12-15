# PDF Export

## Overview

The PDF export feature gates the download button until users reach the final slide, encouraging them to view the entire presentation.

## Configuration

```javascript
SlideVibing.init({
  deckId: 'my-deck',
  pdf: {
    buttonId: 'svDownloadPdfBtn',    // ID of download button
    unlockKey: 'svDeckCompleted',     // localStorage key for unlock state
    unlockOnLastSlide: true            // Unlock when reaching last slide
  }
});
```

## HTML Setup

Add a hidden download button to your UI:

```html
<div class="sv-ui">
  <!-- Other UI elements -->
  <button id="svDownloadPdfBtn" class="sv-btn sv-btn-primary sv-hidden" type="button">
    Download PDF
  </button>
</div>
```

The `sv-hidden` class is removed when the user reaches the final slide.

## How It Works

1. Button starts hidden (`sv-hidden` class)
2. User scrolls through presentation
3. When last slide is reached:
   - `localStorage.setItem(unlockKey, 'true')` is called
   - `sv-hidden` class is removed from button
4. Clicking button opens `?print-pdf` view
5. Browser print dialog appears for PDF save

## Unlock Persistence

The unlock state persists in localStorage:

```javascript
// Check if unlocked
localStorage.getItem('svDeckCompleted') === 'true'

// Manually unlock (for testing)
localStorage.setItem('svDeckCompleted', 'true')

// Reset lock
localStorage.removeItem('svDeckCompleted')
```

## Custom Unlock Key

Use a namespaced key for multiple decks:

```javascript
pdf: {
  buttonId: 'svDownloadPdfBtn',
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
#svDownloadPdfBtn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

#svDownloadPdfBtn:disabled {
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
  buttonId: 'svDownloadPdfBtn',
  unlockOnLastSlide: false  // Never auto-unlock
}
```

Then manually remove `sv-hidden` from the button HTML.
