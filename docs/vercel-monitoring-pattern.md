# Vercel Monitoring Pattern

This document outlines the standard pattern for implementing Vercel Analytics and Speed Insights across the application.

## Overview

We use two Vercel monitoring tools:
- **Analytics**: Tracks visitor data and page views
- **Speed Insights**: Monitors real-world performance metrics

## Implementation

### Root Layout Setup

Both components are added to the root layout (`src/app/layout.tsx`) to ensure monitoring across all pages:

```tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Your app content */}
        {children}

        {/* Monitoring components */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Key Points

1. **Placement**: Both components should be placed before the closing `</body>` tag
2. **Import Path**: Use the `/next` import path for Next.js apps:
   - `@vercel/analytics/next`
   - `@vercel/speed-insights/next`
3. **No Configuration Needed**: Both components work out of the box with no additional props required
4. **Automatic Route Tracking**: The `/next` versions automatically handle route changes in the App Router

## Verification

After deployment to Vercel:

1. **Analytics**: Check your browser's Network tab for requests to `/_vercel/insights/view`
2. **Speed Insights**: Check the Vercel dashboard under Speed Insights tab
3. **Analytics Dashboard**: View data in the Vercel Analytics dashboard

## Packages

Required dependencies in `package.json`:

```json
{
  "dependencies": {
    "@vercel/analytics": "^1.5.0",
    "@vercel/speed-insights": "^1.2.0"
  }
}
```

## References

- [Vercel Analytics Quickstart](https://vercel.com/docs/analytics/quickstart)
- [Vercel Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart)

## Pattern Status

✅ **Implemented** - Added to root layout on 2025-10-29
