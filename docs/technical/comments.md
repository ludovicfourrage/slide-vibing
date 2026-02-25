# Comments System

## Overview

The comment system allows users to select text on slides and create anchored comments. Comments are displayed as numbered markers that can be dragged to reposition.

## Enabling Comments

```javascript
SlideVibing.init({
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

- Key format: `sv:comments:{deckId}`
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
    pollIntervalMs: 3000,  // Sync frequency (default: 1000)
    apiKey: 'GF-SC-7kX9mP2vL8nQ4wR6yT5bJ3cH1fD0aE',
    readUrl: 'https://default296b38384bd5496cbd4bf456ea743b.74.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/4f58c51ab8654ed8bae110f9f859dd70/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=3fHjUQCbKal6XMhnNcZiEoV-Y4YQhdKq6HYdTSQftwY',
    writeUrl: 'https://default296b38384bd5496cbd4bf456ea743b.74.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/cc55d9eccbbc4315a88b938034e876d4/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rJESPmMtQkRjUQz8ajEhYKWdcYmslqb8VLvQ1jpMrVI',
    updateUrl: 'https://default296b38384bd5496cbd4bf456ea743b.74.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8a40a8c8db0f423f9a1c7a18d3b17220/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=dIVpQ--NGYpvAqjcV4aPLQjYmcZphloOCB2qU5-aRQY',
    deleteUrl: 'https://default296b38384bd5496cbd4bf456ea743b.74.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6835afb4628647cb88dd225d34c7c7af/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Tt3EoN4Zo2vbMgCfkdk7FbGxMa1_I1nLY6QgkKJ_FAM',
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
    toggleId: 'svCommentToggle',      // Toggle button
    countId: 'svCommentCount',         // Comment count badge
    syncDotId: 'svSyncDot',            // Sync status indicator
    syncStatusId: 'svSyncStatus',      // Status text
    markersId: 'svCommentMarkers',     // Markers container
    inlineId: 'svInlineComments',      // Inline bubbles container
    panelId: 'svCommentPanel',         // Comment panel
    panelTitleId: 'svPanelTitle',      // Panel title
    panelBodyId: 'svPanelBody',        // Panel body
    closePanelId: 'svClosePanel',      // Close button
    nameModalId: 'svNameModal',        // Name prompt modal
    nameInputId: 'svNameInput',        // Name input field
    nameSubmitId: 'svNameSubmit',       // Name submit button
    confirmModalId: 'svConfirmModal',   // Delete confirmation modal
    confirmTitleId: 'svConfirmTitle',   // Confirmation title
    confirmMessageId: 'svConfirmMessage', // Confirmation message
    confirmDeleteId: 'svConfirmDelete', // Confirm delete button
    confirmCancelId: 'svConfirmCancel'  // Cancel delete button
  }
}
```

## How Comments Work

### Creating Comments

1. Select text on any slide
2. A comment panel appears near the selection
3. Enter your name (first time only, saved to localStorage)
4. Write your comment and click "Add Comment"

The selected text is copied to the clipboard and expanded to the full sentence, which is quoted in the comment.

### Comment Markers

- **Purple marker**: New/active comment
- **Green marker**: Resolved comment
- **Amber marker**: Has replies

Markers can be dragged to reposition. Click to view thread.

### Comment Actions

- **Reply**: Add response to existing comment
- **Edit**: Modify your comment text
- **Resolve**: Mark thread as resolved (turns green)
- **Delete**: Remove comment and all replies (shows confirmation dialog)

### Panel Behavior

The comment panel automatically closes when the user scrolls to a different slide.

## Auto-Injected UI

If comment UI elements aren't in your HTML, the runtime auto-injects them:

```html
<!-- Auto-injected at document start -->
<div class="sv-ui">
  <button id="svCommentToggle">Comments <span id="svCommentCount">0</span></button>
</div>
<div id="svCommentMarkers"></div>
<div id="svInlineComments"></div>
<div id="svCommentPanel">...</div>
<div id="svNameModal">...</div>
<div id="svConfirmModal">...</div>
```

## Comment Badge States

| State | Appearance | Meaning |
|-------|------------|---------|
| Hidden | No badge | No comments |
| `5` | Amber | Total comment count (has unresolved) |
| `✓` | Green | All comments resolved |

## Sync Status Indicators

| Dot Color | Status |
|-----------|--------|
| Green | Synced/connected |
| Amber (pulsing) | Syncing |
| Red | Sync error |
| Gray | Offline/local mode |

## Print Mode

Comments are hidden in `?print-pdf` mode for clean PDF export.
