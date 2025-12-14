# Canvas Animations

## Overview

Canvas controllers provide per-slide animations that play/pause on click and reset when navigating away.

## Basic Setup

### 1. Add Canvas Element

```html
<section>
  <div class="sv2-slide-surface" data-slide-id="slide-demo" data-slide-title="Demo">
    <h2>Animated Demo</h2>
    <canvas id="myCanvas" width="820" height="240" class="sv2-canvas"></canvas>
  </div>
</section>
```

### 2. Register Controller

```javascript
SlidesV2.init({
  deckId: 'my-deck',
  canvas: {
    controllers: [
      {
        canvasId: 'myCanvas',
        slideId: 'slide-demo',
        draw({ ctx, width, height, t, isPlaying }) {
          // Animation code here
        }
      }
    ]
  }
});
```

## Draw Function Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ctx` | CanvasRenderingContext2D | 2D drawing context |
| `width` | number | Canvas width in pixels |
| `height` | number | Canvas height in pixels |
| `t` | number | Elapsed time in milliseconds |
| `isPlaying` | boolean | Whether animation is playing |

## Animation Lifecycle

1. **Initial render**: `t = 10000` (shows "final state")
2. **Click to play**: `t` starts from 0, increments each frame
3. **Click to pause**: Animation freezes at current `t`
4. **Navigate away**: Animation resets to initial state
5. **Return to slide**: Shows final state again

## Example: Bouncing Ball

```javascript
{
  canvasId: 'ballCanvas',
  slideId: 'slide-ball',
  draw({ ctx, width, height, t, isPlaying }) {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Status text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px system-ui';
    ctx.fillText(isPlaying ? 'Playing (click to pause)' : 'Paused (click to play)', 18, 32);

    // Animated ball
    const x = 40 + (width - 80) * (0.5 + 0.45 * Math.sin(t / 600));
    const y = height / 2 + 20 * Math.cos(t / 400);

    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#6366f1';
    ctx.fill();
  }
}
```

## Example: Progress Bar

```javascript
{
  canvasId: 'progressCanvas',
  slideId: 'slide-progress',
  draw({ ctx, width, height, t, isPlaying }) {
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Progress calculation (0 to 1 over 3 seconds)
    const progress = Math.min(1, t / 3000);

    // Track
    ctx.fillStyle = '#334155';
    ctx.fillRect(40, height/2 - 10, width - 80, 20);

    // Fill
    ctx.fillStyle = '#10b981';
    ctx.fillRect(40, height/2 - 10, (width - 80) * progress, 20);

    // Percentage text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(progress * 100)}%`, width/2, height/2 + 50);
  }
}
```

## Example: Data Visualization

```javascript
{
  canvasId: 'chartCanvas',
  slideId: 'slide-chart',
  draw({ ctx, width, height, t, isPlaying }) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const data = [65, 89, 42, 78, 55];
    const barWidth = 60;
    const gap = 30;
    const maxHeight = height - 80;
    const startX = (width - (data.length * (barWidth + gap) - gap)) / 2;

    // Animate bar heights
    const animProgress = Math.min(1, t / 1500);

    data.forEach((value, i) => {
      const barHeight = (value / 100) * maxHeight * animProgress;
      const x = startX + i * (barWidth + gap);
      const y = height - 40 - barHeight;

      // Bar
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Label
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(value, x + barWidth/2, y - 10);
    });
  }
}
```

## Multiple Controllers

```javascript
canvas: {
  controllers: [
    {
      canvasId: 'canvas1',
      slideId: 'slide-a',
      draw({ ctx, width, height, t }) { /* ... */ }
    },
    {
      canvasId: 'canvas2',
      slideId: 'slide-b',
      draw({ ctx, width, height, t }) { /* ... */ }
    }
  ]
}
```

## Canvas Styling

```css
.sv2-canvas {
  width: 100%;
  border-radius: 12px;
  margin-top: 16px;
  border: 1px solid #e2e8f0;
  background: #0f172a;
  cursor: pointer;
}
```

## Print Mode

In `?print-pdf` mode, canvas click is disabled and shows final state (`t = 10000`).
