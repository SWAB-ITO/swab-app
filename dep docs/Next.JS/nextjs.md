# Next.js Documentation

Official documentation for Next.js - The React Framework for building full-stack web applications.

## Overview

Next.js is a React framework that provides built-in features like bundling, compilation, routing, and optimization, allowing developers to focus on building features rather than configuring tooling.

## Official Resources

- **Main Documentation**: https://nextjs.org/docs
- **Getting Started**: https://nextjs.org/docs/getting-started
- **Blog & Updates**: https://nextjs.org/blog
- **GitHub Repository**: https://github.com/vercel/next.js
- **Learn Next.js**: https://nextjs.org/learn

## Project Version

**Current Version in Project**: Next.js 16.0.0 (see package.json:68)

**React Version**: React 19.0.0 (see package.json:69-70)

## Core Features

### 1. Routing
- **File-based routing** - Pages automatically created from file structure
- **App Router** - Modern routing with React Server Components
- **Pages Router** - Original routing system (backward compatible)
- **Dynamic routes** - `[slug]` and `[...slug]` patterns
- **Route groups** - Organize routes without affecting URL structure

### 2. Rendering
- **Server Components** - React components that render on the server
- **Client Components** - Interactive components with `'use client'`
- **Static Site Generation (SSG)** - Pre-render at build time
- **Server-Side Rendering (SSR)** - Render on each request
- **Incremental Static Regeneration (ISR)** - Update static content after build

### 3. Data Fetching
- **Server-side data fetching** - Fetch data in Server Components
- **Client-side data fetching** - SWR, React Query, or fetch API
- **Async Request APIs** - `cookies()`, `headers()`, `params()`
- **Streaming** - Progressive UI rendering with Suspense

### 4. Optimization
- **Image Optimization** - Automatic image optimization via `<Image>`
- **Font Optimization** - Automatic font loading and optimization
- **Script Optimization** - Control third-party script loading
- **Metadata API** - SEO-friendly metadata management

### 5. Performance
- **Code Splitting** - Automatic route-based splitting
- **Turbopack** - Next-generation bundler (stable in Next.js 15+)
- **Bundle Analysis** - Analyze bundle size
- **Performance Monitoring** - Built-in Web Vitals tracking

## Router Comparison

### App Router (Recommended)

**Location**: `src/app/` directory

**Features**:
- React Server Components
- Nested layouts
- Streaming with Suspense
- Built-in loading states
- Server Actions
- Parallel routes
- Intercepting routes

**File Conventions**:
```
app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── loading.tsx         # Loading UI
├── error.tsx           # Error UI
├── not-found.tsx       # 404 UI
└── dashboard/
    ├── layout.tsx      # Nested layout
    └── page.tsx        # Dashboard page
```

### Pages Router (Legacy)

**Location**: `src/pages/` or `pages/` directory

**Features**:
- Traditional React paradigms
- Simpler mental model
- Mature ecosystem
- Backward compatible

**File Conventions**:
```
pages/
├── _app.tsx           # Custom App component
├── _document.tsx      # Custom Document
├── index.tsx          # Home page
├── about.tsx          # /about route
└── api/
    └── hello.ts       # API route
```

## Installation & Setup

### Create New Project

```bash
npx create-next-app@latest my-app
cd my-app
npm run dev
```

### Project Scripts (from package.json)

```bash
# Development
npm run dev              # Start dev server
npm run dev:cloud        # Start with cloud Supabase

# Production
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint
```

## Key Concepts

### 1. Server Components (Default)

Components in the App Router are Server Components by default:

```tsx
// app/page.tsx - Server Component
export default async function Page() {
  const data = await fetch('https://api.example.com/data')
  return <div>{/* Render data */}</div>
}
```

### 2. Client Components

Use `'use client'` for interactive components:

```tsx
// components/counter.tsx
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### 3. Layouts

Shared UI that persists across routes:

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### 4. Data Fetching

```tsx
// Server Component - Fetch directly
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // Revalidate every hour
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{/* Use data */}</div>
}
```

### 5. API Routes

```tsx
// app/api/hello/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  return NextResponse.json({ message: 'Hello World' })
}

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json({ received: body })
}
```

## Next.js 15/16 Features

### React 19 Support
- Full support for React 19 features
- React Compiler ready
- Enhanced Suspense and Transitions

### Turbopack (Stable)
- Up to 76.7% faster local server startup
- Up to 96.3% faster code updates with Fast Refresh

### Enhanced Forms
```tsx
import Form from 'next/form'

export default function Page() {
  return (
    <Form action="/search">
      <input name="query" />
      <button type="submit">Search</button>
    </Form>
  )
}
```

### Async Request APIs
```tsx
// cookies, headers, and params are now async
import { cookies } from 'next/headers'

export async function Page() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')
}
```

### Caching Changes
- `GET` Route Handlers no longer cached by default
- Client Router Cache no longer caches Page components by default
- Opt-in caching with explicit configuration

## Configuration

### next.config.js (or .ts)

```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['example.com'],
  },
  experimental: {
    typedRoutes: true,
  },
}

export default config
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://...
```

**Important**: Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

## Best Practices

### 1. Use Server Components by Default
- Fetch data on the server when possible
- Reduce client-side JavaScript
- Improve initial page load

### 2. Optimize Images
```tsx
import Image from 'next/image'

<Image
  src="/photo.jpg"
  alt="Photo"
  width={500}
  height={300}
  priority // For above-the-fold images
/>
```

### 3. Implement Loading States
```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}
```

### 4. Handle Errors Gracefully
```tsx
// app/dashboard/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### 5. Use Metadata API for SEO
```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Page',
  description: 'Page description',
}

export default function Page() {
  return <div>Content</div>
}
```

## Common Patterns

### 1. Protected Routes
```tsx
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const token = request.cookies.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: '/dashboard/:path*',
}
```

### 2. Dynamic Routes
```tsx
// app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <div>Post: {params.slug}</div>
}

// Generate static params at build time
export async function generateStaticParams() {
  const posts = await fetchPosts()
  return posts.map((post) => ({ slug: post.slug }))
}
```

### 3. Parallel Data Fetching
```tsx
async function Page() {
  // Fetch in parallel
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
  ])

  return <div>{/* Render data */}</div>
}
```

## Deployment

### Vercel (Recommended)
- Zero-configuration deployment
- Automatic HTTPS
- Global CDN
- Preview deployments

### Self-Hosting
- Requires Node.js 18.18.0+
- Build with `npm run build`
- Start with `npm run start`
- Configure for production environment

## Performance Monitoring

### Vercel Analytics Integration

This project includes Vercel Analytics (package.json:61-62):

```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## Troubleshooting

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

### Performance Issues
- Use `next/image` for images
- Implement proper caching strategies
- Use dynamic imports for large components
- Enable Turbopack: `next dev --turbo`

### Hydration Errors
- Ensure server and client render the same content
- Avoid using browser-only APIs in Server Components
- Check for mismatched HTML tags

## Additional Resources

- **Examples**: https://github.com/vercel/next.js/tree/canary/examples
- **Discussions**: https://github.com/vercel/next.js/discussions
- **Discord**: https://nextjs.org/discord
- **Updates**: Follow @nextjs on Twitter/X

## Migration Guides

- **Pages to App Router**: https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration
- **Version Upgrades**: https://nextjs.org/docs/app/building-your-application/upgrading
- **Codemods**: Use `@next/codemod` for automated migrations
