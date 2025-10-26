# Design System Specification
**Version:** 1.0.0
**Based on:** shadcn/ui + Tailwind CSS + Radix UI

---

## Principles

1. **Consistency First** - Every instance of a pattern should look and behave identically
2. **Composability** - Build complex components from simple primitives
3. **Accessibility** - WCAG 2.1 AA compliance minimum
4. **Mobile-First** - Design for smallest screen, enhance for larger
5. **Own Your Code** - Copy components into codebase, customize as needed

---

## Color System

### Semantic Colors

Replace all hardcoded colors with semantic tokens:

```typescript
// lib/design-tokens.ts
export const semanticColors = {
  success: {
    bg: 'hsl(142, 76%, 95%)',      // Very light green
    bgSubtle: 'hsl(142, 76%, 90%)', // Light green
    border: 'hsl(142, 76%, 85%)',   // Green border
    text: 'hsl(142, 76%, 25%)',     // Dark green text
    textMuted: 'hsl(142, 76%, 35%)', // Medium green text
    DEFAULT: 'hsl(142, 76%, 45%)',  // Primary green
  },
  warning: {
    bg: 'hsl(45, 93%, 95%)',        // Very light yellow
    bgSubtle: 'hsl(45, 93%, 90%)',  // Light yellow
    border: 'hsl(45, 93%, 85%)',    // Yellow border
    text: 'hsl(45, 93%, 25%)',      // Dark yellow/orange text
    textMuted: 'hsl(45, 93%, 35%)', // Medium yellow text
    DEFAULT: 'hsl(45, 93%, 47%)',   // Primary yellow
  },
  error: {
    bg: 'hsl(0, 93%, 95%)',         // Very light red
    bgSubtle: 'hsl(0, 93%, 90%)',   // Light red
    border: 'hsl(0, 93%, 85%)',     // Red border
    text: 'hsl(0, 93%, 30%)',       // Dark red text
    textMuted: 'hsl(0, 93%, 40%)',  // Medium red text
    DEFAULT: 'hsl(0, 93%, 50%)',    // Primary red
  },
  info: {
    bg: 'hsl(210, 93%, 95%)',       // Very light blue
    bgSubtle: 'hsl(210, 93%, 90%)',  // Light blue
    border: 'hsl(210, 93%, 85%)',   // Blue border
    text: 'hsl(210, 93%, 25%)',     // Dark blue text
    textMuted: 'hsl(210, 93%, 35%)', // Medium blue text
    DEFAULT: 'hsl(210, 93%, 50%)',  // Primary blue
  },
};
```

### Usage Examples

**Before:**
```tsx
<Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>
<Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>
```

**After:**
```tsx
<Badge variant="success">Success</Badge>
<Badge variant="error">Error</Badge>
```

---

## Spacing System

### Scale

Base unit: 4px (0.25rem)

```typescript
export const spacing = {
  0: '0',           // 0px
  px: '1px',        // 1px
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
};
```

### Usage Guidelines

| Context | Value | Example |
|---------|-------|---------|
| Component internal padding | 4 (16px) | `p-4` inside cards |
| Component gaps | 2 (8px) | `gap-2` between icon and text |
| Section spacing | 6 (24px) or 8 (32px) | `space-y-6` between card groups |
| Page margin bottom | 8 (32px) | `mb-8` between page sections |
| Form field spacing | 4 (16px) | `space-y-4` in forms |
| Card padding | 6 (24px) | `p-6` for card content |
| Tight layouts | 3 (12px) | `gap-3` for compact lists |

### Consistency Rules

1. **Cards:** Always use `p-6` for CardContent padding
2. **Section Spacing:** Always use `space-y-6` or `space-y-8` between major sections
3. **Inline Elements:** Always use `gap-2` between icon and text
4. **Forms:** Always use `space-y-4` between form fields
5. **Grids:** Use `gap-4` for card grids, `gap-6` for large item grids

---

## Typography

### Scale

```typescript
export const typography = {
  display: {
    fontSize: '2.25rem',    // 36px (text-4xl)
    lineHeight: '2.5rem',   // 40px
    fontWeight: '700',      // bold
    letterSpacing: '-0.025em', // tight
  },
  h1: {
    fontSize: '1.875rem',   // 30px (text-3xl)
    lineHeight: '2.25rem',  // 36px
    fontWeight: '600',      // semibold
    letterSpacing: '-0.025em',
  },
  h2: {
    fontSize: '1.5rem',     // 24px (text-2xl)
    lineHeight: '2rem',     // 32px
    fontWeight: '600',      // semibold
    letterSpacing: '-0.025em',
  },
  h3: {
    fontSize: '1.25rem',    // 20px (text-xl)
    lineHeight: '1.75rem',  // 28px
    fontWeight: '600',      // semibold
  },
  bodyLg: {
    fontSize: '1.125rem',   // 18px (text-lg)
    lineHeight: '1.75rem',  // 28px
    fontWeight: '400',      // normal
  },
  body: {
    fontSize: '1rem',       // 16px (text-base)
    lineHeight: '1.5rem',   // 24px
    fontWeight: '400',      // normal
  },
  bodySm: {
    fontSize: '0.875rem',   // 14px (text-sm)
    lineHeight: '1.25rem',  // 20px
    fontWeight: '400',      // normal
  },
  caption: {
    fontSize: '0.75rem',    // 12px (text-xs)
    lineHeight: '1rem',     // 16px
    fontWeight: '400',      // normal
  },
};
```

### Usage Guidelines

| Element | Class | When to Use |
|---------|-------|-------------|
| Page Title | `.text-display` | Main page heading |
| Section Title | `.text-h2` | Major section headers |
| Card Title | `.text-h3` | Card headers |
| Body Text | `.text-body` | Main content, descriptions |
| Small Text | `.text-body-sm` | Secondary info, labels |
| Caption | `.text-caption` | Timestamps, meta info |

### Utility Classes

Create these in `globals.css`:

```css
@layer utilities {
  .text-display {
    @apply text-4xl font-bold tracking-tight;
  }

  .text-h1 {
    @apply text-3xl font-semibold tracking-tight;
  }

  .text-h2 {
    @apply text-2xl font-semibold tracking-tight;
  }

  .text-h3 {
    @apply text-xl font-semibold;
  }

  .text-body-lg {
    @apply text-lg;
  }

  .text-body {
    @apply text-base;
  }

  .text-body-sm {
    @apply text-sm;
  }

  .text-caption {
    @apply text-xs;
  }
}
```

---

## Icon System

### Sizes

```typescript
export const iconSizes = {
  xs: 'h-3 w-3',      // 12px - inline with caption text
  sm: 'h-4 w-4',      // 16px - inline with body text, buttons
  md: 'h-5 w-5',      // 20px - card headers, nav items
  lg: 'h-6 w-6',      // 24px - prominent actions
  xl: 'h-8 w-8',      // 32px - feature icons
  '2xl': 'h-12 w-12', // 48px - empty states, uploads
};
```

### Usage Guidelines

| Context | Size | Example |
|---------|------|---------|
| Button text | sm | `<CheckCircle className="h-4 w-4" />` |
| Card header | md | `<Database className="h-5 w-5" />` |
| Navigation | md | `<Home className="h-5 w-5" />` |
| Status indicator | sm | `<AlertCircle className="h-4 w-4" />` |
| Upload area | 2xl | `<Upload className="h-12 w-12" />` |

---

## Component Variants

### Badge Variants

```typescript
// Extend src/components/ui/badge.tsx
variants: {
  variant: {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground",
    outline: "text-foreground",

    // NEW SEMANTIC VARIANTS
    success: "bg-success-bg text-success-text border-success-border",
    warning: "bg-warning-bg text-warning-text border-warning-border",
    error: "bg-error-bg text-error-text border-error-border",
    info: "bg-info-bg text-info-text border-info-border",
  },
  size: {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",  // default
    lg: "px-3 py-1 text-sm",
  }
}
```

### Button Hierarchy

```typescript
// Primary action (one per view)
<Button variant="default">Save</Button>

// Secondary actions
<Button variant="outline">Cancel</Button>

// Tertiary actions
<Button variant="ghost">Learn More</Button>

// Destructive actions
<Button variant="destructive">Delete</Button>
```

### Card Hierarchy

```typescript
// Standard card
<Card>...</Card>

// Elevated card (important content)
<Card className="shadow-lg">...</Card>

// Outlined card (less prominent)
<Card variant="outline">...</Card>

// Interactive card
<Card className="hover:shadow-md transition-shadow cursor-pointer">...</Card>
```

---

## Layout Patterns

### Container

```tsx
// All pages use same container
<div className="container mx-auto p-6 max-w-7xl">
  {/* content */}
</div>
```

### Page Header

```tsx
// Consistent header pattern
<div className="mb-8">
  <h1 className="text-display mb-2">Page Title</h1>
  <p className="text-muted-foreground text-lg">Page description</p>
</div>
<Separator className="mb-8" />
```

### Card Grid

```tsx
// 1 col mobile, 2 col tablet, 4 col desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>...</Card>
</div>
```

### Two-Column Layout

```tsx
// Stack on mobile, side-by-side on desktop
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

---

## Animation System

### Duration

```typescript
export const duration = {
  fast: '150ms',    // micro-interactions
  normal: '200ms',  // default transitions
  slow: '300ms',    // complex animations
};
```

### Easing

```typescript
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',  // ease-in-out
  in: 'cubic-bezier(0.4, 0, 1, 1)',         // ease-in
  out: 'cubic-bezier(0, 0, 0.2, 1)',        // ease-out
};
```

### Common Animations

```css
/* Fade in */
.animate-fade-in {
  animation: fadeIn 200ms ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide in from top */
.animate-slide-in-top {
  animation: slideInTop 200ms ease-out;
}

@keyframes slideInTop {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

---

## Responsive Breakpoints

```typescript
export const breakpoints = {
  sm: '640px',   // Mobile landscape, small tablets
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops
  xl: '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
};
```

### Usage Strategy

**Mobile First:** Start with mobile layout, add breakpoints to enhance

```tsx
// ✅ CORRECT: Mobile first
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

// ❌ WRONG: Desktop first
<div className="grid grid-cols-4 lg:grid-cols-2 sm:grid-cols-1">
```

### Common Patterns

```tsx
// Stack to horizontal
<div className="flex flex-col sm:flex-row gap-4">

// Show on desktop only
<div className="hidden lg:block">

// Hide on mobile
<div className="sm:block hidden">

// Different padding by screen
<div className="p-4 lg:p-6">
```

---

## Accessibility Standards

### Color Contrast

- **Normal Text:** Minimum 4.5:1 contrast ratio
- **Large Text:** Minimum 3:1 contrast ratio
- **Interactive Elements:** Minimum 3:1 contrast ratio

### Keyboard Navigation

All interactive elements must be:
1. Focusable (tabbable)
2. Have visible focus indicator
3. Operable with keyboard alone

### ARIA Labels

```tsx
// Buttons without text
<Button aria-label="Close menu">
  <X className="h-4 w-4" />
</Button>

// Loading states
<Button disabled aria-busy="true">
  <Loader2 className="animate-spin" />
  Loading...
</Button>

// Status indicators
<div role="status" aria-live="polite">
  {message}
</div>
```

---

## Code Style Guidelines

### Component Composition

```tsx
// ✅ GOOD: Compose from primitives
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// ❌ BAD: Custom card structure
<div className="bg-white rounded p-4">
  <h3 className="font-bold">Title</h3>
  <p>Description</p>
  <div>Content</div>
</div>
```

### Conditional Rendering

```tsx
// ✅ GOOD: Extract to variable
const statusColor = status === 'success' ? 'text-green-600' : 'text-red-600';
<span className={statusColor}>{status}</span>

// ❌ BAD: Inline ternary in className
<span className={status === 'success' ? 'text-green-600' : 'text-red-600'}>{status}</span>
```

### Component Extraction

```tsx
// ✅ GOOD: Extract repeated patterns
<StatusBadge status="completed" />

// ❌ BAD: Inline repeated logic
{status === 'completed' && <Badge className="bg-green-100">Completed</Badge>}
```

---

## File Organization

```
src/
├── app/                    # Next.js pages
├── components/
│   ├── ui/                # shadcn primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── composite/         # Composed components
│   │   ├── status-badge.tsx
│   │   ├── console-output.tsx
│   │   └── stat-card.tsx
│   ├── features/          # Feature-specific
│   │   ├── sync/
│   │   └── dashboard/
│   └── layout/            # Layout components
├── lib/
│   ├── design-tokens.ts   # Design system tokens
│   ├── utils.ts          # Utility functions
│   └── constants.ts      # App constants
└── styles/
    └── globals.css       # Global styles
```

---

## Migration Strategy

### Phase 1: Add tokens (no breaking changes)
1. Add semantic colors to tailwind.config.ts
2. Add spacing scale documentation
3. Add typography utilities to globals.css

### Phase 2: Extend primitives
1. Add Badge variants (success, warning, error, info)
2. Update Button sizes if needed
3. Update Card variants if needed

### Phase 3: Create composite components
1. StatusBadge
2. ConsoleOutput
3. StatCard
4. Checklist
5. FormSelector

### Phase 4: Refactor pages
1. Replace hardcoded colors with semantic variants
2. Replace duplicated code with components
3. Standardize spacing

### Phase 5: Polish
1. Add animations
2. Improve accessibility
3. Add dark mode support
