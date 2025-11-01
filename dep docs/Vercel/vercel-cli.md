# Vercel CLI

Official documentation for the Vercel Command Line Interface.

## Overview

The Vercel CLI enables developers to manage and configure Vercel projects from the command line, providing direct access to deployment, development, and infrastructure management features.

## Official Resources

- **CLI Documentation**: https://vercel.com/docs/cli
- **npm Package**: https://www.npmjs.com/package/vercel
- **GitHub Repository**: https://github.com/vercel/vercel

## Installation

### Global Installation (Recommended)

```bash
# Using pnpm (recommended)
pnpm i -g vercel

# Using npm
npm i -g vercel

# Using yarn
yarn global add vercel

# Using bun
bun add -g vercel
```

### Project Installation

```bash
npm i vercel
```

## Updates

To update to the latest version:

```bash
pnpm i -g vercel@latest
```

The CLI automatically notifies you when updates are available.

## Version Check

```bash
vercel --version
```

## Authentication

### Interactive Login

```bash
vercel login
```

### CI/CD Authentication

For non-interactive environments, create an authentication token on your account's tokens page and use:

```bash
vercel --token YOUR_TOKEN
```

## Primary Commands

### Deployment

```bash
vercel deploy
```

### Local Development

```bash
vercel dev
```

Before running `vercel dev`, make sure to install your dependencies with `npm install`.

### View Logs

```bash
vercel logs
```

### Environment Variables

```bash
vercel env
```

### Infrastructure Management

```bash
vercel domains
vercel dns
vercel certs
```

### Deployment Management

```bash
vercel rollback
vercel promote
```

## Primary Use Cases

- Deploy projects to production
- Replicate deployment environments locally
- Retrieve deployment logs
- Manage SSL certificates
- Manage DNS records
- Configure environment variables
- Manage deployments (rollback, promote)

## Available Commands

The CLI includes 30+ commands covering all aspects of Vercel project management. For programmatic platform interaction, Vercel also provides a REST API.

## Latest Version

v48.4.0 (as of November 2025)

## Notes

- The CLI requires authentication before accessing resources
- Supports multiple package managers (pnpm, npm, yarn, bun)
- Provides both interactive and non-interactive (CI/CD) modes
- Integrates with Vercel's REST API for programmatic access
