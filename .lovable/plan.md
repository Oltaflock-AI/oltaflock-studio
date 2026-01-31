

# OltaFlock Creative Studio - Complete UI & Balance Fix

## Executive Summary

This plan addresses all UI layout issues, fixes the Check Balance flow, and polishes the studio to achieve a Notion-like, production-grade experience.

---

## Part 1: Fix Check Balance Button (CRITICAL)

### Current Issue
The edge function IS working correctly (verified in logs - returns `Credits Remaining : 8794.9`), but the frontend may be failing to parse the response properly because:
1. The edge function sets `Content-Type: application/json` but returns plain text
2. Supabase's `functions.invoke()` may be trying to parse the response as JSON and failing

### Solution

**File: `supabase/functions/check-balance/index.ts`**

Fix the Content-Type mismatch by properly handling text responses:

```typescript
// Instead of returning raw text with JSON content-type,
// wrap the text in a JSON object
return new Response(
  JSON.stringify({ balance: data.trim() }),
  {
    status: response.status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  }
);
```

**File: `src/components/studio/BalanceButton.tsx`**

Improve the parsing to handle the wrapped response:

```typescript
// Parse response - edge function now wraps text in { balance: "..." }
if (data?.balance) {
  const match = data.balance.match(/[\d,]+\.?\d*/);
  balanceValue = match ? match[0] : data.balance;
} else if (typeof data === 'string') {
  // Fallback for direct string
  const match = data.match(/[\d,]+\.?\d*/);
  balanceValue = match ? match[0] : data.trim();
}
```

---

## Part 2: Fix Layout Structure (HIGH PRIORITY)

### Current Issues
- Panels feel cramped at w-40 / w-52
- Generate button area shows conditional Regenerate button that may look "orphan"
- Model name text can overflow
- Typography is inconsistent

### New Layout System

**File: `src/pages/Index.tsx`**

Redesign with cleaner 3-column layout:

```
+--------+------------+------------------------+----------+
| LEFT   | CONTROLS   |      OUTPUT CANVAS     | DETAILS  |
| w-44   | w-60       |       (flexible)       | w-64     |
+--------+------------+------------------------+----------+
```

Changes:
- Left sidebar: `w-44` (176px) - Mode + History
- Controls panel: `w-60` (240px) - Prompt, Model, Controls
- Center: `flex-1` - Output canvas (hero)
- Right sidebar: `w-64` (256px) - Request details

**Key improvements:**
1. Increase controls panel width to prevent model name clipping
2. Increase right details panel for better readability
3. Add proper section headers
4. Remove harsh separators, use subtler visual grouping

---

## Part 3: Fix Generate Button Area

### Current Issue
The Regenerate button appears next to Generate conditionally, which can look like an orphan button.

**File: `src/components/studio/GenerateButton.tsx`**

Redesign to:
1. Make Generate button always full-width
2. Show Regenerate only as a small icon button or after output
3. Remove visual cramping

```tsx
<div className="space-y-2">
  <Button onClick={handleGenerate} disabled={!canGenerate} className="w-full h-11">
    {isGenerating ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {getButtonText()}
      </>
    ) : (
      <>
        <Play className="h-4 w-4 mr-2" />
        {getButtonText()}
      </>
    )}
  </Button>
  
  {/* Only show Regenerate below, not inline */}
  {currentOutput && !pendingRating && !isGenerating && (
    <Button variant="outline" onClick={handleRegenerate} className="w-full h-9 text-xs">
      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
      Regenerate with Same Settings
    </Button>
  )}
</div>
```

---

## Part 4: Fix Model Selector Overflow

### Current Issue
Model names like "Nano Banana Pro" overflow their container.

**File: `src/components/studio/ModelSelector.tsx`**

Changes:
1. Use text truncation on select trigger
2. Simplify dropdown items (remove full descriptions in trigger)
3. Add `truncate` class to prevent overflow

```tsx
<SelectTrigger className="w-full bg-input border-border h-10">
  <SelectValue placeholder="Select model" className="truncate" />
</SelectTrigger>
```

For dropdown items, keep descriptions but ensure they fit:
```tsx
<SelectItem key={model.id} value={model.id}>
  <div className="flex flex-col gap-0.5">
    <span className="font-medium text-sm">{model.displayName}</span>
    <span className="text-[10px] text-muted-foreground line-clamp-1">
      {MODEL_DESCRIPTIONS[model.id]}
    </span>
  </div>
</SelectItem>
```

---

## Part 5: Improve Mode Selector

### Current Issue
Mode selector feels cramped and doesn't highlight selection well.

**File: `src/components/studio/ModeSelector.tsx`**

Improvements:
1. Better visual distinction for active state
2. Reduce padding for compact but readable layout
3. Remove descriptions in narrow layout

```tsx
<button
  className={cn(
    'w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-all',
    isActive 
      ? 'bg-primary text-primary-foreground shadow-sm' 
      : option.enabled
        ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        : 'text-muted-foreground/40 cursor-not-allowed'
  )}
>
```

---

## Part 6: Improve History Panel

### Current Issue
History items are dense with too much information packed together.

**File: `src/components/studio/RequestsPanel.tsx`**

Redesign history items:
1. Simpler card design
2. Clearer status indicator
3. Better visual hierarchy
4. Subtle hover/selected states

```tsx
<div
  className={cn(
    'px-2.5 py-2 rounded-lg border cursor-pointer transition-all group',
    isSelected 
      ? 'bg-accent border-primary/40 shadow-sm' 
      : 'bg-card border-transparent hover:border-border hover:bg-accent/50'
  )}
>
  {/* Status dot + Prompt preview */}
  <div className="flex items-start gap-2">
    <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', statusDotColor)} />
    <p className="text-xs line-clamp-2 flex-1">{promptPreview}</p>
  </div>
  
  {/* Footer: Model + Time */}
  <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
    <span className="truncate max-w-[80px]">{generation.model}</span>
    <span>{format(createdAt, 'HH:mm')}</span>
  </div>
</div>
```

---

## Part 7: Enhance Output Canvas

### Current Issue
Output feels like "a box" not "the hero canvas."

**File: `src/components/studio/OutputDisplay.tsx`**

Changes:
1. Remove harsh borders
2. Add subtle shadow instead
3. Better empty state with illustration
4. Smooth transitions between states

```tsx
// Container with softer styling
<div className="h-full flex flex-col gap-3 overflow-hidden">
  <div className="flex-1 bg-muted/30 rounded-xl overflow-hidden relative group min-h-0 shadow-inner">
    <div className="absolute inset-0 flex items-center justify-center p-4">
      {/* Content */}
    </div>
  </div>
</div>
```

---

## Part 8: Improve Request Details Panel

### Current Issue
Panel is too narrow and metadata is hard to scan.

**File: `src/components/studio/RequestDetailPanel.tsx`**

Changes:
1. Better section grouping
2. Clearer labels
3. Improved spacing
4. Scrollable with more room

---

## Part 9: Global Polish

### Typography & Spacing
- Use consistent font sizes: `text-xs` for labels, `text-sm` for content
- Consistent padding: `p-3` for major sections
- Use `gap-3` between sections

### Transitions
Add smooth transitions:
```css
.transition-all { transition: all 0.15s ease-out; }
```

### Loading States
Replace empty divs with skeleton loaders for:
- History loading
- Output loading
- Details loading

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/check-balance/index.ts` | Wrap text response in JSON object |
| `src/components/studio/BalanceButton.tsx` | Improved parsing, better error states |
| `src/pages/Index.tsx` | New column widths, improved structure |
| `src/components/studio/GenerateButton.tsx` | Stack buttons vertically, remove cramping |
| `src/components/studio/ModelSelector.tsx` | Truncate text, fix overflow |
| `src/components/studio/ModeSelector.tsx` | Better active states, cleaner layout |
| `src/components/studio/RequestsPanel.tsx` | Simpler history cards, status dots |
| `src/components/studio/OutputDisplay.tsx` | Softer styling, better empty state |
| `src/components/studio/RequestDetailPanel.tsx` | Better spacing, clearer hierarchy |
| `src/components/studio/PromptInput.tsx` | Adjust height for new layout |

---

## Acceptance Criteria

After implementation:

| Criteria | Status |
|----------|--------|
| Check Balance displays credits correctly | ⬜ |
| No clipped text or hidden elements | ⬜ |
| Model selector shows full names | ⬜ |
| Generate button is clear and prominent | ⬜ |
| History items are scannable | ⬜ |
| Output canvas feels like the hero | ⬜ |
| Request details are readable | ⬜ |
| No horizontal scrolling | ⬜ |
| Works on 13", 15", 16" laptops | ⬜ |
| Dark mode has proper contrast | ⬜ |

---

## Technical Notes

### Balance Check Issue
The root cause is Content-Type mismatch. The edge function returns plain text with `Content-Type: application/json`. When `supabase.functions.invoke()` receives this, it may try to parse as JSON and fail silently or return an unexpected format.

**Fix**: Wrap the text response in a proper JSON object in the edge function.

### Layout Sizing
Current total fixed width: 40 + 52 + 52 = 144 units = 576px
New total fixed width: 44 + 60 + 64 = 168 units = 672px
This still leaves ~694px on a 1366px screen for the output canvas.

### Model Name Overflow
The `SelectValue` component needs explicit truncation. Adding `[&>span]:truncate` or wrapping content in a truncated span will prevent overflow.

