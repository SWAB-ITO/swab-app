/**
 * Design System Tokens
 *
 * Centralized design tokens for the SWAB Mentor Database.
 * Based on principles defined in ai/UI-Redesign/DESIGN_SYSTEM.md
 *
 * @version 1.0.0
 */

/**
 * Semantic Color Tokens
 *
 * Use these tokens for consistent color usage throughout the application.
 * Each semantic color has variants for different use cases:
 * - bg: Background color (very light)
 * - bgSubtle: Subtle background (light)
 * - border: Border color
 * - text: Primary text color (dark)
 * - textMuted: Secondary text color (medium)
 * - DEFAULT: Primary color for badges/indicators
 */
export const semanticColors = {
  success: {
    bg: 'hsl(142, 76%, 95%)',        // Very light green
    bgSubtle: 'hsl(142, 76%, 90%)',   // Light green
    border: 'hsl(142, 76%, 85%)',     // Green border
    text: 'hsl(142, 76%, 25%)',       // Dark green text
    textMuted: 'hsl(142, 76%, 35%)',  // Medium green text
    DEFAULT: 'hsl(142, 76%, 45%)',    // Primary green
  },
  warning: {
    bg: 'hsl(45, 93%, 95%)',          // Very light yellow
    bgSubtle: 'hsl(45, 93%, 90%)',    // Light yellow
    border: 'hsl(45, 93%, 85%)',      // Yellow border
    text: 'hsl(45, 93%, 25%)',        // Dark yellow/orange text
    textMuted: 'hsl(45, 93%, 35%)',   // Medium yellow text
    DEFAULT: 'hsl(45, 93%, 47%)',     // Primary yellow
  },
  error: {
    bg: 'hsl(0, 93%, 95%)',           // Very light red
    bgSubtle: 'hsl(0, 93%, 90%)',     // Light red
    border: 'hsl(0, 93%, 85%)',       // Red border
    text: 'hsl(0, 93%, 30%)',         // Dark red text
    textMuted: 'hsl(0, 93%, 40%)',    // Medium red text
    DEFAULT: 'hsl(0, 93%, 50%)',      // Primary red
  },
  info: {
    bg: 'hsl(210, 93%, 95%)',         // Very light blue
    bgSubtle: 'hsl(210, 93%, 90%)',   // Light blue
    border: 'hsl(210, 93%, 85%)',     // Blue border
    text: 'hsl(210, 93%, 25%)',       // Dark blue text
    textMuted: 'hsl(210, 93%, 35%)',  // Medium blue text
    DEFAULT: 'hsl(210, 93%, 50%)',    // Primary blue
  },
};

/**
 * Spacing Scale
 *
 * Base unit: 4px (0.25rem)
 * Use these values for consistent spacing throughout the application.
 */
export const spacing = {
  0: '0',                // 0px
  px: '1px',             // 1px
  0.5: '0.125rem',       // 2px
  1: '0.25rem',          // 4px
  2: '0.5rem',           // 8px
  3: '0.75rem',          // 12px
  4: '1rem',             // 16px
  5: '1.25rem',          // 20px
  6: '1.5rem',           // 24px
  8: '2rem',             // 32px
  10: '2.5rem',          // 40px
  12: '3rem',            // 48px
  16: '4rem',            // 64px
};

/**
 * Spacing Usage Guidelines
 *
 * - Component internal padding: spacing[4] (16px)
 * - Component gaps: spacing[2] (8px)
 * - Section spacing: spacing[6] or spacing[8] (24px or 32px)
 * - Page margin bottom: spacing[8] (32px)
 * - Form field spacing: spacing[4] (16px)
 * - Card padding: spacing[6] (24px)
 * - Tight layouts: spacing[3] (12px)
 */

/**
 * Typography Scale
 *
 * Defines font sizes, line heights, weights, and letter spacing
 * for consistent typography throughout the application.
 */
export const typography = {
  display: {
    fontSize: '2.25rem',        // 36px (text-4xl)
    lineHeight: '2.5rem',       // 40px
    fontWeight: '700',          // bold
    letterSpacing: '-0.025em',  // tight
  },
  h1: {
    fontSize: '1.875rem',       // 30px (text-3xl)
    lineHeight: '2.25rem',      // 36px
    fontWeight: '600',          // semibold
    letterSpacing: '-0.025em',  // tight
  },
  h2: {
    fontSize: '1.5rem',         // 24px (text-2xl)
    lineHeight: '2rem',         // 32px
    fontWeight: '600',          // semibold
    letterSpacing: '-0.025em',  // tight
  },
  h3: {
    fontSize: '1.25rem',        // 20px (text-xl)
    lineHeight: '1.75rem',      // 28px
    fontWeight: '600',          // semibold
  },
  bodyLg: {
    fontSize: '1.125rem',       // 18px (text-lg)
    lineHeight: '1.75rem',      // 28px
    fontWeight: '400',          // normal
  },
  body: {
    fontSize: '1rem',           // 16px (text-base)
    lineHeight: '1.5rem',       // 24px
    fontWeight: '400',          // normal
  },
  bodySm: {
    fontSize: '0.875rem',       // 14px (text-sm)
    lineHeight: '1.25rem',      // 20px
    fontWeight: '400',          // normal
  },
  caption: {
    fontSize: '0.75rem',        // 12px (text-xs)
    lineHeight: '1rem',         // 16px
    fontWeight: '400',          // normal
  },
};

/**
 * Icon Size Scale
 *
 * Standard icon sizes for consistent icon usage.
 */
export const iconSizes = {
  xs: 'h-3 w-3',      // 12px - inline with caption text
  sm: 'h-4 w-4',      // 16px - inline with body text, buttons
  md: 'h-5 w-5',      // 20px - card headers, nav items
  lg: 'h-6 w-6',      // 24px - prominent actions
  xl: 'h-8 w-8',      // 32px - feature icons
  '2xl': 'h-12 w-12', // 48px - empty states, uploads
};

/**
 * Animation Duration
 *
 * Standard animation durations for consistent timing.
 */
export const duration = {
  fast: '150ms',      // micro-interactions
  normal: '200ms',    // default transitions
  slow: '300ms',      // complex animations
};

/**
 * Animation Easing
 *
 * Standard easing functions for smooth animations.
 */
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',  // ease-in-out
  in: 'cubic-bezier(0.4, 0, 1, 1)',         // ease-in
  out: 'cubic-bezier(0, 0, 0.2, 1)',        // ease-out
};

/**
 * Responsive Breakpoints
 *
 * Standard breakpoints for responsive design.
 * Use mobile-first approach: start with mobile, enhance for larger screens.
 */
export const breakpoints = {
  sm: '640px',      // Mobile landscape, small tablets
  md: '768px',      // Tablets
  lg: '1024px',     // Small laptops
  xl: '1280px',     // Desktops
  '2xl': '1536px',  // Large desktops
};
