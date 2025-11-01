# shadcn/ui Documentation

Official documentation for shadcn/ui - A beautifully-designed, accessible component system.

## Overview

shadcn/ui is **not a traditional component library**. Instead, it's a code distribution platform that gives you the actual component source code. You own the code and can customize it to your exact needs.

**Key Philosophy**: "This is how you build your component library."

## Official Resources

- **Main Website**: https://ui.shadcn.com/
- **Documentation**: https://ui.shadcn.com/docs
- **GitHub**: https://github.com/shadcn-ui/ui
- **Components**: https://ui.shadcn.com/docs/components
- **Themes**: https://ui.shadcn.com/themes
- **Examples**: https://ui.shadcn.com/examples

## Project Setup

**Current Version**: shadcn@3.4.0 (see package.json:82)

**Installed Components** (from package.json):
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-tabs
- @tanstack/react-table

**Supporting Libraries**:
- `class-variance-authority` - For component variants
- `clsx` - For conditional classes
- `tailwind-merge` - For merging Tailwind classes
- `lucide-react` - For icons
- `cmdk` - For command menu

## Core Principles

### 1. Open Code
You get the full source code for each component. No hidden abstractions, no compiled packages. Modify components directly in your codebase.

### 2. Composition
All components share a common interface, making them predictable and easy to use together.

### 3. Distribution
Components are distributed via a CLI tool and flat-file schema, making it easy to share components across projects.

### 4. Beautiful Defaults
Components work well out of the box with thoughtful styling and accessibility.

### 5. AI-Ready
Open code structure allows LLMs to understand and improve components.

## Installation

### Initial Setup

```bash
# Initialize shadcn/ui in your project
npx shadcn@latest init
```

This will:
1. Configure `components.json`
2. Set up Tailwind CSS
3. Add CSS variables for theming
4. Create a `components/ui` directory

### Add Components

```bash
# Add specific components
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu

# Add multiple components at once
npx shadcn@latest add button dialog dropdown-menu

# Add all components
npx shadcn@latest add --all
```

## Component Structure

### File Location
Components are installed to:
```
src/components/ui/
├── button.tsx
├── dialog.tsx
├── dropdown-menu.tsx
└── ...
```

### Example Component

```tsx
// src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background hover:bg-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## Usage Examples

### Button Component

```tsx
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div>
      <Button>Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Delete</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}
```

### Dialog Component

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

### Dropdown Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Open Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Theming

### CSS Variables

shadcn/ui uses CSS variables for theming:

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    /* ... more variables */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    /* ... dark mode colors */
  }
}
```

### Dark Mode

```tsx
// Use next-themes for dark mode
import { ThemeProvider } from "next-themes"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## CLI Commands

### Add Components

```bash
# Add single component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add button dialog dropdown-menu

# Add all components
npx shadcn@latest add --all

# Add with specific path
npx shadcn@latest add button --path src/components/ui
```

### Diff Components

```bash
# Check for updates to components
npx shadcn@latest diff
```

### Update Components

```bash
# Update specific component
npx shadcn@latest update button

# Update all components
npx shadcn@latest update
```

## Available Components (60+)

### Form & Input
- Button
- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Slider
- Label
- Form

### Layout
- Card
- Separator
- Tabs
- Accordion
- Collapsible
- Sidebar
- Resizable

### Navigation
- Navigation Menu
- Breadcrumb
- Pagination
- Command (⌘K)

### Feedback
- Alert
- Alert Dialog
- Toast
- Dialog
- Drawer
- Popover
- Tooltip
- Progress

### Data Display
- Table
- Data Table
- Avatar
- Badge
- Skeleton
- Calendar
- Carousel

### Advanced
- Combobox
- Context Menu
- Hover Card
- Menubar
- Sheet
- Sonner (Toast alternative)
- Toggle
- Toggle Group

## Customization

### Modify Component

Since you own the code, you can modify components directly:

```tsx
// src/components/ui/button.tsx
// Change the base styles
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-base font-semibold", // Modified
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700", // Custom colors
        // ... other variants
      },
    },
  }
)
```

### Create Custom Variants

```tsx
const buttonVariants = cva(
  "...",
  {
    variants: {
      variant: {
        // ... existing variants
        brand: "bg-brand text-white hover:bg-brand/90", // New variant
      },
    },
  }
)

// Usage
<Button variant="brand">Brand Button</Button>
```

### Extend Components

```tsx
// src/components/icon-button.tsx
import { Button, type ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode
  loading?: boolean
}

export function IconButton({ icon, loading, children, ...props }: IconButtonProps) {
  return (
    <Button {...props}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
      {children}
    </Button>
  )
}
```

## Integration with Radix UI

shadcn/ui is built on top of Radix UI primitives:

- **Unstyled, accessible components** from Radix UI
- **Beautiful styling** from shadcn/ui
- **Full customization** since you own the code

This project already has many Radix UI components installed (see package.json:47-57).

## MCP Server

This project includes the shadcn MCP server for AI-assisted component discovery:

```json
// .mcp.json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

This allows Claude Code to:
- Search for components
- Get component documentation
- View usage examples
- Access implementation details

## Best Practices

### 1. Use the cn() Utility

```tsx
import { cn } from "@/lib/utils"

// Merge classes safely
<div className={cn("base-class", condition && "conditional-class", className)} />
```

### 2. Create Composite Components

```tsx
// Combine multiple shadcn components
export function SearchCombobox() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox">
          {/* Content */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {/* Items */}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

### 3. Version Control Components

Commit your components to version control. Since you own the code, track changes just like any other code.

### 4. Document Custom Changes

Add comments to modified components:

```tsx
// CUSTOM: Modified border radius from 'md' to 'lg'
const buttonVariants = cva(
  "... rounded-lg ..." // Changed from rounded-md
)
```

### 5. Use TypeScript

All components are fully typed with TypeScript for excellent IDE support.

## Icons with Lucide React

This project uses Lucide React for icons (package.json:67):

```tsx
import { Check, X, ChevronDown } from "lucide-react"

<Button>
  <Check className="mr-2 h-4 w-4" />
  Save
</Button>
```

**Icon Browser**: https://lucide.dev/icons/

## Troubleshooting

### Component Not Found

```bash
# Reinstall component
npx shadcn@latest add button

# Check components.json configuration
cat components.json
```

### Styling Issues

```bash
# Ensure Tailwind is configured properly
# Check tailwind.config.js includes components path

content: [
  "./src/components/**/*.{ts,tsx}",
]
```

### TypeScript Errors

```bash
# Ensure @/lib/utils is properly configured
# Check tsconfig.json paths

"paths": {
  "@/*": ["./src/*"]
}
```

## Additional Resources

- **Examples**: https://ui.shadcn.com/examples
- **Themes**: https://ui.shadcn.com/themes (pre-built color schemes)
- **Blocks**: https://ui.shadcn.com/blocks (larger component patterns)
- **Charts**: https://ui.shadcn.com/charts (data visualization)
- **Discord**: Community support
- **GitHub Issues**: Bug reports and feature requests

## Migration & Updates

### Update All Components

```bash
# Check for updates
npx shadcn@latest diff

# Update all components
npx shadcn@latest update

# Update specific component
npx shadcn@latest update button
```

### Breaking Changes

Since you own the code, you control when and how to update. Review changes before applying updates.

## Why Use shadcn/ui?

✅ **Full Control** - Own and modify the code
✅ **No Lock-in** - Not tied to npm package updates
✅ **Type Safety** - Full TypeScript support
✅ **Accessibility** - Built on Radix UI primitives
✅ **Customizable** - Easy to theme and modify
✅ **Modern** - Works with React 19 and Next.js 16
✅ **AI-Ready** - LLMs can read and improve components
