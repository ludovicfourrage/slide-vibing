# Data Visualization

## Core Principles

### One Message Per Chart
Every chart should communicate exactly one insight. If you have multiple messages, use multiple charts.

❌ A chart showing revenue, costs, and headcount trends
✅ Three focused charts, each with a clear headline

### Title States the Insight
Chart titles should communicate what the data shows, not describe the chart type.

❌ "Revenue by Quarter"
✅ "Revenue accelerated in Q3-Q4 after product launch"

❌ "Market Share Comparison"
✅ "We've lost 5 points of share to Competitor X since 2022"

### Maximize Data-Ink Ratio
Remove everything that doesn't contribute to understanding.

Remove:
- Gridlines (or make very light)
- Redundant labels
- Decorative elements
- 3D effects
- Excessive colors

Keep:
- Data points
- Essential labels
- Clear axis titles
- Relevant annotations

## Chart Selection Guide

### Comparison
**Bar Charts** - Comparing values across categories
- Use horizontal bars for many categories or long labels
- Use vertical bars for time series or few categories
- Always start axis at zero

### Trend Over Time
**Line Charts** - Showing change over time
- Use for continuous data
- Limit to 4-5 lines maximum
- Consider small multiples for more series

### Part-to-Whole
**Stacked Bars or Pie Charts** - Showing composition
- Pie charts: Use sparingly, maximum 5 segments
- Stacked bars: Better for comparing across categories
- 100% stacked: When absolute values less important

### Distribution
**Histograms or Box Plots** - Understanding spread
- Histograms for shape of distribution
- Box plots for comparing distributions

### Relationship
**Scatter Plots** - Correlation between variables
- Add trend line if relationship is clear
- Use size/color for third dimension sparingly

## Color Usage

### Semantic Colors
Use color consistently to convey meaning:

- **Green**: Positive, growth, success, us
- **Red**: Negative, decline, risk, action needed
- **Blue**: Neutral, primary data
- **Gray**: Context, secondary, historical

### Color Hierarchy
- **Emphasis**: Bold, saturated color for key data
- **Context**: Muted, gray for supporting data
- **Highlight**: Accent color for callouts

### Accessibility
- Don't rely on color alone
- Ensure sufficient contrast
- Test with colorblind simulation

## Annotations

### When to Annotate
- Key events that explain changes
- Targets or benchmarks
- Outliers that need context
- The specific insight you're highlighting

### Annotation Best Practices
- Keep text brief (5-10 words)
- Point directly to relevant data
- Use consistent styling
- Don't over-annotate

## Common Chart Mistakes

### Truncated Axes
❌ Starting bar chart axis at 50 to exaggerate small differences
✅ Start at zero, or use a different chart type

### Too Many Categories
❌ Pie chart with 12 slices
✅ Show top 5 + "Other", or use bar chart

### Misleading Comparisons
❌ Comparing absolute numbers when percentages matter
✅ Choose metric that answers the actual question

### Chartjunk
❌ 3D effects, excessive gridlines, decorative images
✅ Clean, minimal design focused on data

## Chart Templates

### Performance vs. Target
```
[Bar chart]
- Actual performance as solid bars
- Target as dotted line or marker
- Color bars green (above target) or red (below)
- Headline: "3 of 5 regions exceeded Q3 targets"
```

### Trend with Context
```
[Line chart]
- Primary metric as bold line
- Market/benchmark as thin gray line
- Key events annotated
- Headline: "Growth outpaced market after repositioning in Q2"
```

### Waterfall for Change
```
[Waterfall chart]
- Starting value → Contributing factors → Ending value
- Positive factors in green, negative in red
- Headline: "Price increases offset volume decline, driving net revenue growth"
```

### Comparison Matrix
```
[Heat map or bubble chart]
- Compare options across criteria
- Use color intensity or size for scores
- Headline: "Option B scores highest on strategic fit and feasibility"
```
