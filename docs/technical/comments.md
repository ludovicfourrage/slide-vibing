# Comments System

## Overview

The comment system allows users to select text on slides and create anchored comments. Comments are displayed as numbered markers that can be dragged to reposition.

## Enabling Comments

```javascript
SlidesV2.init({
  deckId: 'my-deck',
  comments: {
    enabled: true,
    storage: {
      type: 'local'  // or 'powerAutomate'
    }
  }
});
```

## Storage Options

### Local Storage (Default)

Comments stored in browser localStorage:

```javascript
comments: {
  enabled: true,
  storage: {
    type: 'local'
  }
}
```

- Key format: `sv2:comments:{deckId}`
- Persists across sessions
- No server required
- Per-browser/device only

### Power Automate Backend

For shared/synced comments across users:

```javascript
comments: {
  enabled: true,
  storage: {
    type: 'powerAutomate',
    requireBackend: true,  // Disable commenting if backend unreachable
    apiKey: 'your-api-key',
    readUrl: 'https://...',
    writeUrl: 'https://...',
    updateUrl: 'https://...',
    deleteUrl: 'https://...',
    pollIntervalMs: 1000,  // Sync frequency (default: 1000)
    errorAfter: 3,         // Show error after N failures
    fallbackAfter: 10      // Fall back to local after N failures
  }
}
```

## UI Configuration

Customize element IDs if using custom HTML:

```javascript
comments: {
  enabled: true,
  storage: { type: 'local' },
  ui: {
    toggleId: 'sv2CommentToggle',      // Toggle button
    countId: 'sv2CommentCount',         // Comment count badge
    syncDotId: 'sv2SyncDot',            // Sync status indicator
    syncStatusId: 'sv2SyncStatus',      // Status text
    markersId: 'sv2CommentMarkers',     // Markers container
    inlineId: 'sv2InlineComments',      // Inline bubbles container
    panelId: 'sv2CommentPanel',         // Comment panel
    panelTitleId: 'sv2PanelTitle',      // Panel title
    panelBodyId: 'sv2PanelBody',        // Panel body
    closePanelId: 'sv2ClosePanel',      // Close button
    nameModalId: 'sv2NameModal',        // Name prompt modal
    nameInputId: 'sv2NameInput',        // Name input field
    nameSubmitId: 'sv2NameSubmit'       // Name submit button
  }
}
```

## How Comments Work

### Creating Comments

1. Select text on any slide
2. A comment panel appears near the selection
3. Enter your name (first time only, saved to localStorage)
4. Write your comment and click "Add Comment"

The selected text is expanded to the full sentence and quoted in the comment.

### Comment Markers

- **Purple marker**: New/active comment
- **Green marker**: Resolved comment
- **Amber marker**: Has replies

Markers can be dragged to reposition. Click to view thread.

### Comment Actions

- **Reply**: Add response to existing comment
- **Edit**: Modify your comment text
- **Resolve**: Mark thread as resolved (turns green)
- **Delete**: Remove comment and all replies

## Auto-Injected UI

If comment UI elements aren't in your HTML, the runtime auto-injects them:

```html
<!-- Auto-injected at document start -->
<div class="sv2-ui">
  <button id="sv2CommentToggle">Comments <span id="sv2CommentCount">0</span></button>
</div>
<div id="sv2CommentMarkers"></div>
<div id="sv2InlineComments"></div>
<div id="sv2CommentPanel">...</div>
<div id="sv2NameModal">...</div>
<div id="sv2ConfirmModal">...</div>
```

## Comment Badge States

| State | Appearance | Meaning |
|-------|------------|---------|
| Hidden | No badge | No comments |
| `3/5` | Amber | 3 unresolved of 5 total |
| `✓ 5` | Green | All 5 resolved |

## Sync Status Indicators

| Dot Color | Status |
|-----------|--------|
| Green | Synced/connected |
| Amber (pulsing) | Syncing |
| Red | Sync error |
| Gray | Offline/local mode |

## Print Mode

Comments are hidden in `?print-pdf` mode for clean PDF export.
