# Monitoring & Analytics Standards

## Overview

This document defines the standard patterns for implementing monitoring and analytics across the SWAB application.

## Vercel Analytics & Speed Insights

**Status**: ✅ Implemented (2025-10-29)

### What We Use

1. **Vercel Analytics** (`@vercel/analytics`)
   - Tracks page views and visitor data
   - Provides user journey insights
   - Automatic route tracking in Next.js

2. **Vercel Speed Insights** (`@vercel/speed-insights`)
   - Real-world performance metrics
   - Web Vitals monitoring (LCP, FID, CLS, etc.)
   - Load time tracking

### Implementation Pattern

Both components are added to the **root layout only** (`src/app/layout.tsx`):

```tsx
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* App content */}
        {children}

        {/* Monitoring - always at the end, before closing body tag */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Key Rules

✅ **DO:**
- Add both components to root layout only
- Place before closing `</body>` tag
- Use the `/next` import path for Next.js apps
- Let them work with zero configuration

❌ **DON'T:**
- Add to individual pages (root layout covers all pages)
- Add configuration unless specifically needed
- Use React import path (`@vercel/analytics/react`) in Next.js

### File Locations

- **Implementation**: `src/app/layout.tsx`
- **Pattern docs**: `docs/vercel-monitoring-pattern.md`
- **Packages**: Listed in `package.json` dependencies

### Verification After Deployment

1. Open browser DevTools → Network tab
2. Look for requests to `/_vercel/insights/view`
3. Check Vercel dashboard → Analytics & Speed Insights tabs

### Dependencies

```json
{
  "@vercel/analytics": "^1.5.0",
  "@vercel/speed-insights": "^1.2.0"
}
```

### References

- [Detailed Implementation Guide](../../docs/vercel-monitoring-pattern.md)
- [Vercel Analytics Docs](https://vercel.com/docs/analytics/quickstart)
- [Vercel Speed Insights Docs](https://vercel.com/docs/speed-insights/quickstart)

---

## Future Monitoring Considerations

As the app scales, consider:
- Custom event tracking for specific user actions
- Error monitoring (Sentry, LogRocket, etc.)
- Performance budgets and alerts
- A/B testing integration
