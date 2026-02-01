
# OltaFlock Creative Studio - Premium UI Redesign

## Overview

This comprehensive UI refinement elevates OltaFlock Creative Studio to match the polish and precision of Notion, Linear, and Midjourney. The focus is on visual hierarchy, spacing consistency, smooth micro-interactions, and a gallery-grade output experience - without changing core functionality.

---

## Design System Enhancements

### Color & Theme Refinements

**File: `src/index.css`**

Refine the CSS variables for better contrast and visual hierarchy:

```css
:root {
  /* Refined light theme */
  --background: 0 0% 98%;           /* Slightly warmer */
  --foreground: 220 13% 13%;        /* Darker for better contrast */
  --card: 0 0% 100%;                /* Pure white cards */
  --card-foreground: 220 13% 13%;
  --muted: 220 9% 46%;
  --muted-foreground: 220 9% 46%;
  --border: 220 13% 91%;            /* Softer borders */
  --input: 220 13% 95%;             /* Subtle input backgrounds */
  
  /* Refined shadows for depth */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow-panel: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-canvas: inset 0 1px 2px 0 rgb(0 0 0 / 0.03);
}

.dark {
  /* Refined dark theme */
  --background: 220 13% 8%;         /* Slightly warmer dark */
  --card: 220 13% 11%;
  --border: 220 13% 18%;
  --shadow-canvas: inset 0 1px 2px 0 rgb(0 0 0 / 0.15);
}
```

Add utility classes for consistent elevation:

```css
@layer utilities {
  .elevation-panel {
    box-shadow: var(--shadow-panel);
  }
  
  .elevation-card {
    box-shadow: var(--shadow-card);
  }
  
  .canvas-inset {
    box-shadow: var(--shadow-canvas);
  }
  
  .transition-smooth {
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
```

---

## Layout Architecture

### Refined Three-Column Layout

**File: `src/pages/Index.tsx`**

Optimize panel widths and spacing for common laptop sizes (13", 15", 16"):

```
+----------+--------------+------------------------+------------+
| MODE &   |   CONTROLS   |     OUTPUT CANVAS      |  REQUEST   |
| HISTORY  |              |      (flexible)        |  DETAILS   |
|  w-48    |    w-72      |                        |   w-72     |
| (192px)  |   (288px)    |                        |  (288px)   |
+----------+--------------+------------------------+------------+
```

**Key changes:**
- Left sidebar: `w-48` (192px) - roomier mode/history
- Controls panel: `w-72` (288px) - prevents text overflow
- Right sidebar: `w-72` (288px) - readable request details
- Center: `flex-1 min-w-[400px]` - ensures canvas hero space

**Header refinements:**
- Increase height to `h-12` for better proportion
- Add subtle bottom shadow instead of hard border
- Better logo and title spacing

```tsx
<header className="flex items-center justify-between px-4 py-2.5 bg-card shrink-0 h-12 elevation-panel border-b border-border/50">
  <div className="flex items-center gap-3">
    <img src={oltaflockLogo} alt="OltaFlock" className="h-6 w-6 rounded-lg object-cover shadow-sm" />
    <h1 className="text-sm font-semibold tracking-tight">
      OltaFlock Creative Studio
    </h1>
  </div>
  {/* ... */}
</header>
```

---

## Component-Level Refinements

### 1. Mode Selector - Premium Navigation

**File: `src/components/studio/ModeSelector.tsx`**

Transform into a refined navigation with clear active states:

```tsx
<button
  className={cn(
    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-smooth',
    isActive 
      ? 'bg-primary/10 text-primary border border-primary/20' 
      : option.enabled
        ? 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
        : 'text-muted-foreground/40 cursor-not-allowed',
    'group'
  )}
>
  <Icon className={cn(
    'h-4 w-4 shrink-0 transition-smooth',
    isActive && 'text-primary'
  )} />
  <span className="font-medium text-xs tracking-wide">
    {option.label}
  </span>
</button>
```

**Visual improvements:**
- Softer active state with border accent
- Smoother hover transitions
- Better icon-to-text alignment

---

### 2. Prompt Input - Premium Composition Area

**File: `src/components/studio/PromptInput.tsx`**

Elevate the prompt input to feel like a premium writing experience:

```tsx
<div className="space-y-2.5">
  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
    Prompt
  </Label>
  <div className="relative group">
    <Textarea
      value={rawPrompt}
      onChange={(e) => setRawPrompt(e.target.value)}
      placeholder="Describe your creative vision..."
      className={cn(
        "min-h-[160px] bg-background border-border/60 resize-none",
        "text-sm leading-relaxed tracking-normal",
        "placeholder:text-muted-foreground/40 placeholder:italic",
        "focus:border-primary/40 focus:ring-2 focus:ring-primary/10",
        "transition-smooth rounded-xl p-4"
      )}
      disabled={pendingRating}
    />
    {/* Floating character counter */}
    <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/60 font-mono">
      {rawPrompt.length}
    </div>
  </div>
</div>
```

**Key improvements:**
- Larger min-height for comfortable writing
- Refined focus ring with primary color
- Floating character counter
- Subtle placeholder styling
- Smoother border radius

---

### 3. Model Selector - Clear & Scannable

**File: `src/components/studio/ModelSelector.tsx`**

Improve dropdown readability and prevent overflow:

```tsx
<div className="space-y-2.5">
  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
    Model
  </Label>
  <Select>
    <SelectTrigger className={cn(
      "w-full bg-background border-border/60 h-11 rounded-lg",
      "hover:border-border transition-smooth",
      "[&>span]:truncate [&>span]:block [&>span]:max-w-[180px]"
    )}>
      <SelectValue placeholder="Select model" />
    </SelectTrigger>
    <SelectContent className="max-h-[320px]">
      <SelectGroup>
        <SelectLabel className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-2">
          <ModeIcon className="h-3.5 w-3.5" />
          {modeInfo.label}
        </SelectLabel>
        {modelsToDisplay.map((model) => (
          <SelectItem 
            key={model.id} 
            value={model.id}
            className="py-3 px-3 cursor-pointer"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-sm truncate max-w-[220px]">
                {model.displayName}
              </span>
              <span className="text-[11px] text-muted-foreground line-clamp-1">
                {MODEL_DESCRIPTIONS[model.id]}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
</div>
```

---

### 4. Generate Button - Visual Anchor

**File: `src/components/studio/GenerateButton.tsx`**

Make the Generate button the strongest visual element:

```tsx
<div className="space-y-3">
  <Button
    onClick={handleGenerate}
    disabled={!canGenerate}
    className={cn(
      "w-full h-12 text-sm font-semibold tracking-wide",
      "bg-primary hover:bg-primary/90 text-primary-foreground",
      "shadow-md hover:shadow-lg transition-all duration-200",
      "disabled:opacity-50 disabled:shadow-none",
      "rounded-xl"
    )}
    size="lg"
  >
    {isSubmitting ? (
      <>
        <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
        <span>Starting...</span>
      </>
    ) : (
      <>
        <Play className="h-4 w-4 mr-2.5 fill-current" />
        <span>{mode === 'image-to-image' ? 'Transform' : 'Generate'}</span>
      </>
    )}
  </Button>
  
  {hasCompletedOutput && !pendingRating && !isSubmitting && (
    <Button
      variant="ghost"
      onClick={handleRegenerateFromJob}
      className="w-full h-9 text-xs text-muted-foreground hover:text-foreground"
    >
      <RotateCcw className="h-3.5 w-3.5 mr-2" />
      Regenerate
    </Button>
  )}
</div>
```

---

### 5. Output Canvas - Gallery-Grade Display

**File: `src/components/studio/OutputDisplay.tsx`**

Transform the output area into a premium gallery experience:

```tsx
{/* Success state - Gallery display */}
<div className="h-full flex flex-col gap-4 overflow-hidden">
  {/* Canvas container with refined styling */}
  <div className={cn(
    "flex-1 rounded-2xl overflow-hidden relative group min-h-0",
    "bg-gradient-to-b from-muted/20 to-muted/40 dark:from-muted/10 dark:to-muted/30",
    "canvas-inset"
  )}>
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <img
        src={selectedGeneration.output_url}
        alt="Generated output"
        className={cn(
          "max-w-full max-h-full object-contain",
          "rounded-xl shadow-xl",
          "cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
        )}
        onClick={() => setIsFullscreen(true)}
      />
    </div>
    
    {/* Floating action bar */}
    <div className={cn(
      "absolute bottom-0 left-0 right-0 p-4",
      "bg-gradient-to-t from-background/95 via-background/60 to-transparent",
      "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    )}>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" className="h-9 px-4 rounded-lg shadow-sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        {/* ... other actions */}
      </div>
    </div>
  </div>
</div>
```

**Loading state - Refined progress display:**

```tsx
<div className="h-full flex flex-col items-center justify-center p-8">
  <div className="relative mb-8">
    <div className={cn(
      "w-24 h-24 rounded-2xl",
      "bg-gradient-to-br from-primary/20 to-primary/5",
      "flex items-center justify-center"
    )}>
      <Sparkles className="h-10 w-10 text-primary animate-pulse" />
    </div>
    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-lg">
      <span className="text-[11px] font-bold text-primary">{progress}%</span>
    </div>
  </div>
  
  <Progress value={progress} className="w-56 h-1.5 mb-4" />
  
  <p className="text-sm font-medium text-foreground">{getProgressLabel()}</p>
  <p className="text-xs text-muted-foreground mt-1">{selectedGeneration.model}</p>
</div>
```

---

### 6. History Panel - Compact & Scannable

**File: `src/components/studio/RequestsPanel.tsx`**

Refine history items for better visual hierarchy:

```tsx
<div
  className={cn(
    'px-3 py-2.5 rounded-xl cursor-pointer transition-smooth group',
    isSelected 
      ? 'bg-primary/8 ring-1 ring-primary/20' 
      : 'hover:bg-accent/40'
  )}
>
  {/* Header: Status + Time */}
  <div className="flex items-center justify-between mb-1.5">
    <div className="flex items-center gap-2">
      <div className={cn('h-2 w-2 rounded-full', statusDotColors[status])} />
      <ModeIcon className="h-3 w-3 text-muted-foreground" />
    </div>
    <span className="text-[10px] text-muted-foreground font-mono">
      {format(createdAt, 'HH:mm')}
    </span>
  </div>
  
  {/* Prompt preview */}
  <p className="text-xs leading-relaxed line-clamp-2 text-foreground/80 mb-2">
    {promptPreview}
  </p>
  
  {/* Progress bar for active jobs */}
  {isActive && (
    <div className="flex items-center gap-2">
      <Progress value={progress} className="h-1 flex-1" />
      <span className="text-[9px] text-primary font-semibold tabular-nums">
        {progress}%
      </span>
    </div>
  )}
  
  {/* Footer: Model name */}
  <div className="flex items-center justify-between mt-1.5">
    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
      {generation.model}
    </span>
    <Button
      variant="ghost"
      size="icon"
      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => handleDelete(e, generation.id)}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
</div>
```

---

### 7. Request Details Panel - Clear Hierarchy

**File: `src/components/studio/RequestDetailPanel.tsx`**

Improve section grouping and typography:

```tsx
<ScrollArea className="h-full">
  <div className="p-4 space-y-5">
    {/* Status Badge + Type */}
    <div className="flex items-center justify-between pb-4 border-b border-border/50">
      <div className="flex items-center gap-2.5">
        <ModeIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium capitalize">{selectedGeneration.type}</span>
      </div>
      <Badge className={cn('text-[10px] px-2.5 py-1 rounded-md font-medium', statusStyles[status])}>
        {statusLabels[status]}
      </Badge>
    </div>

    {/* Metadata Group */}
    <div className="space-y-4">
      <DetailSection icon={Hash} label="Request ID">
        <code className="text-[10px] font-mono bg-muted/50 px-2.5 py-1.5 rounded-md block break-all">
          {selectedGeneration.request_id}
        </code>
      </DetailSection>
      
      <DetailSection icon={Clock} label="Created">
        <span className="text-sm">{format(createdAt, 'PPp')}</span>
      </DetailSection>
      
      <DetailSection icon={Cpu} label="Model">
        <span className="text-sm font-medium">{selectedGeneration.model}</span>
      </DetailSection>
    </div>

    <Separator className="bg-border/50" />

    {/* Prompt Section */}
    <DetailSection icon={MessageSquare} label="Prompt">
      <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-y-auto">
        <p className="text-xs leading-relaxed whitespace-pre-wrap">
          {selectedGeneration.user_prompt}
        </p>
      </div>
    </DetailSection>

    {/* ... more sections */}
  </div>
</ScrollArea>
```

Helper component for consistent sections:

```tsx
function DetailSection({ icon: Icon, label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}
```

---

### 8. Model Controls - Refined Dropdowns

**File: `src/components/studio/controls/*.tsx` (all control files)**

Consistent styling across all control components:

```tsx
<div className="space-y-2.5">
  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
    Aspect Ratio
  </Label>
  <Select>
    <SelectTrigger className="w-full bg-background border-border/60 h-10 rounded-lg hover:border-border transition-smooth">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {options.map(opt => (
        <SelectItem key={opt} value={opt} className="py-2.5">
          {opt}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

### 9. Rating Panel - Subtle Integration

**File: `src/components/studio/RatingPanel.tsx`**

Softer visual treatment:

```tsx
<div className="bg-card/50 border border-primary/20 rounded-xl p-4 backdrop-blur-sm">
  <p className="text-sm font-medium text-foreground mb-3">
    Rate this generation
  </p>
  <div className="flex gap-2">
    {([1, 2, 3, 4, 5] as const).map((rating) => (
      <Button
        key={rating}
        variant="outline"
        size="sm"
        onClick={() => handleRating(rating)}
        className="flex items-center gap-1.5 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-smooth"
      >
        <Star className="h-3.5 w-3.5" />
        {rating}
      </Button>
    ))}
  </div>
</div>
```

---

### 10. Progress Component - Refined Bar

**File: `src/components/ui/progress.tsx`**

Smoother progress bar with animation:

```tsx
<ProgressPrimitive.Root
  className={cn(
    "relative h-2 w-full overflow-hidden rounded-full",
    "bg-secondary/30",
    className
  )}
>
  <ProgressPrimitive.Indicator
    className={cn(
      "h-full w-full flex-1 bg-primary rounded-full",
      "transition-all duration-500 ease-out"
    )}
    style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
  />
</ProgressPrimitive.Root>
```

---

### 11. Header Actions - Polished Buttons

**File: `src/components/studio/BalanceButton.tsx`**

More refined balance display:

```tsx
<div className="flex items-center gap-2">
  {balance && (
    <div className="text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg border border-primary/10">
      <span className="tabular-nums">{balance}</span>
      <span className="text-primary/70 ml-1">credits</span>
    </div>
  )}
  
  <Button
    variant="ghost"
    size="sm"
    onClick={handleCheckBalance}
    disabled={isChecking}
    className="h-8 px-3 gap-2 hover:bg-accent rounded-lg"
  >
    {/* ... */}
  </Button>
</div>
```

**File: `src/components/studio/ThemeToggle.tsx`**

Refined toggle:

```tsx
<Button 
  variant="ghost" 
  size="sm" 
  className="h-8 w-8 p-0 hover:bg-accent rounded-lg"
>
  {getIcon()}
</Button>
```

---

## Animation & Micro-interactions

### Add Global Transitions

**File: `src/index.css`**

```css
/* Smooth state transitions */
@layer utilities {
  .transition-smooth {
    transition-property: color, background-color, border-color, box-shadow, opacity, transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  
  .transition-colors-smooth {
    transition-property: color, background-color, border-color;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 100ms;
  }
}

/* Subtle fade-in for content */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

/* Refined pulse for loading states */
@keyframes gentle-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-gentle-pulse {
  animation: gentle-pulse 2s ease-in-out infinite;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Refined color tokens, shadows, utility classes, animations |
| `src/pages/Index.tsx` | Updated panel widths (w-48, w-72, w-72), refined header |
| `src/components/studio/ModeSelector.tsx` | Softer active states, better transitions |
| `src/components/studio/PromptInput.tsx` | Premium textarea, floating counter |
| `src/components/studio/ModelSelector.tsx` | Truncation fixes, better dropdown styling |
| `src/components/studio/GenerateButton.tsx` | Stronger visual weight, shadow, refined secondary action |
| `src/components/studio/OutputDisplay.tsx` | Gallery-grade canvas, gradient overlays, refined progress |
| `src/components/studio/RequestsPanel.tsx` | Cleaner cards, better status indicators |
| `src/components/studio/RequestDetailPanel.tsx` | Section grouping, typography hierarchy |
| `src/components/studio/RatingPanel.tsx` | Softer styling |
| `src/components/studio/BalanceButton.tsx` | Refined balance display |
| `src/components/studio/ThemeToggle.tsx` | Icon-only button |
| `src/components/ui/progress.tsx` | Smoother animation |
| `src/components/studio/controls/*.tsx` | Consistent label/dropdown styling |

---

## Visual Summary

```text
Before                              After
┌─────────────────────────┐        ┌─────────────────────────┐
│ Cramped    │ Overflow   │        │ Spacious  │ Clear      │
│ w-44       │ w-60       │   →    │ w-48      │ w-72       │
│ Hard       │ Clipped    │        │ Soft      │ Truncated  │
│ borders    │ text       │        │ shadows   │ properly   │
└─────────────────────────┘        └─────────────────────────┘

┌─────────────────────────┐        ┌─────────────────────────┐
│    [Generate]           │        │    ╔═══════════════╗    │
│    Small button         │   →    │    ║   Generate    ║    │
│                         │        │    ╚═══════════════╝    │
│                         │        │    Strong visual anchor │
└─────────────────────────┘        └─────────────────────────┘

┌─────────────────────────┐        ┌─────────────────────────┐
│    [Image]              │        │    ┌─────────────┐      │
│    Hard border          │   →    │    │   Image     │      │
│    No shadow            │        │    │   Shadow    │      │
│                         │        │    │   Gallery   │      │
│                         │        │    └─────────────┘      │
└─────────────────────────┘        └─────────────────────────┘
```

---

## Acceptance Criteria

| Requirement | Implementation |
|-------------|----------------|
| No clipped text anywhere | Truncation + wider panels |
| Model names fit cleanly | `max-w` + `truncate` classes |
| Clear visual hierarchy | Refined typography scale |
| Smooth transitions | `transition-smooth` utility |
| Gallery-grade output | Gradient overlays, shadows |
| History is scannable | Status dots, cleaner cards |
| Generate is prominent | Larger, shadowed, filled icon |
| Works on 13-16" screens | Responsive panel widths |
| Dark mode has proper contrast | Refined dark color tokens |
| Feels fast and calm | Subtle, purposeful animations |

---

## Technical Notes

### Panel Width Calculations

```text
Total fixed width: 48 + 72 + 72 = 192 units = 768px
Minimum center canvas: 400px
Minimum viewport: 1168px (covers 13" MacBook at 1280px)

1366px viewport → 598px canvas ✓
1440px viewport → 672px canvas ✓  
1680px viewport → 912px canvas ✓
```

### Typography Scale

```text
Labels:    text-[11px] uppercase tracking-wider font-semibold
Body:      text-sm leading-relaxed
Captions:  text-xs text-muted-foreground
Mono:      text-[10px] font-mono tabular-nums
```

### Spacing System

```text
Panel padding: p-4
Section gaps:  space-y-5
Input gaps:    space-y-2.5
Card padding:  px-3 py-2.5
```
