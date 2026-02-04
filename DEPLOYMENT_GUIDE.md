# GreenFlow Deployment Guide

**Version**: 1.0
**Last Updated**: 2026-02-04
**Status**: Production-Ready

---

## Overview

This guide covers deployment of GreenFlow (green-logistics-landing) to production environments, including:
- Frontend deployment (Vercel, Netlify, AWS S3)
- Environment configuration
- CI/CD pipeline management
- Monitoring & error tracking
- Performance optimization

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Local Verification](#local-verification)
3. [Deployment Platforms](#deployment-platforms)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### 1. Environment Variables by Stage

#### Development (.env.development)
```env
# Development - Uses LocalStack
VITE_API_BASE_URL=http://localhost:3000/api/v2
VITE_ENV=development
VITE_LOG_LEVEL=debug
VITE_ENABLE_MOCK_DATA=true
LOCALSTACK_ENABLED=true
```

#### Staging (.env.staging)
```env
# Staging - Uses AWS staging environment
VITE_API_BASE_URL=https://staging-api.greenflow.dev/api/v2
VITE_ENV=staging
VITE_LOG_LEVEL=info
VITE_ENABLE_MOCK_DATA=false
VITE_SENTRY_DSN=https://your-staging-sentry-key@sentry.io/project
VITE_ANALYTICS_KEY=staging-ga-key
```

#### Production (.env.production)
```env
# Production - Uses AWS production environment
VITE_API_BASE_URL=https://api.greenflow.dev/api/v2
VITE_ENV=production
VITE_LOG_LEVEL=warn
VITE_ENABLE_MOCK_DATA=false
VITE_SENTRY_DSN=https://your-prod-sentry-key@sentry.io/project
VITE_ANALYTICS_KEY=prod-ga-key
```

### 2. Build Environment Variables

Create `.env.build` for build-time configuration:

```env
# Build configuration
VITE_VERSION=1.0.0
VITE_BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
VITE_GIT_COMMIT=$(git rev-parse --short HEAD)
VITE_GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
```

---

## Local Verification

### Pre-Deployment Checklist

```bash
# 1. Install dependencies
npm ci

# 2. Run linter
npm run lint

# 3. Type check
npm run build

# 4. Run E2E tests
npm run test:e2e

# 5. Build production bundle
npm run build

# 6. Preview production build
npm run preview

# 7. Check bundle size
du -sh dist/
ls -lh dist/assets/*.js
```

### Bundle Size Targets

| Metric | Target | Current |
|--------|--------|---------|
| Total JS | < 400 kB | 797.6 kB |
| Total CSS | < 50 kB | 34.56 kB |
| Total Size | < 500 kB | 797.6 kB |
| Gzip JS | < 150 kB | 239 kB |
| Gzip CSS | < 15 kB | 6.1 kB |

**Note**: Current bundle size exceeds targets. See [Performance Optimization](#performance-optimization) section.

---

## Deployment Platforms

### Option 1: Vercel (Recommended)

**Pros**: Zero-config, auto scaling, preview deployments, serverless analytics
**Cons**: Vendor lock-in, edge functions require pro plan

#### Setup

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Configure project
vercel link
# Select: Create and link new project
# Framework: Vite
# Output directory: dist

# 4. Add environment variables
vercel env add VITE_API_BASE_URL
vercel env add VITE_SENTRY_DSN
vercel env add VITE_ANALYTICS_KEY

# 5. Deploy
vercel --prod
```

#### Vercel Configuration File (vercel.json)

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "outputDirectory": "dist",
  "env": [
    {
      "key": "VITE_API_BASE_URL",
      "value": "@api_base_url"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Option 2: Netlify

**Pros**: Easy GitHub integration, built-in analytics, serverless functions
**Cons**: Smaller ecosystem, higher egress costs

#### Setup

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Login
netlify login

# 3. Configure build
netlify init
# Select: Create & configure new site
# Build command: npm run build
# Publish directory: dist

# 4. Set environment variables
netlify env:set VITE_API_BASE_URL https://api.greenflow.dev/api/v2

# 5. Deploy
netlify deploy --prod
```

#### Netlify Configuration File (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_ENV = "production"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/"
  [headers.values]
    Cache-Control = "public, max-age=3600, must-revalidate"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
```

### Option 3: AWS S3 + CloudFront

**Pros**: Full control, scalable, integrates with AWS ecosystem
**Cons**: Complex setup, requires AWS expertise

#### Setup

```bash
# 1. Create S3 bucket
aws s3 mb s3://greenflow-frontend --region us-east-1

# 2. Enable static hosting
aws s3 website s3://greenflow-frontend \
  --index-document index.html \
  --error-document index.html

# 3. Build and upload
npm run build
aws s3 sync dist/ s3://greenflow-frontend/ \
  --delete \
  --cache-control "max-age=31536000" \
  --exclude "*.html"

aws s3 sync dist/ s3://greenflow-frontend/ \
  --delete \
  --cache-control "max-age=3600" \
  --exclude "*" \
  --include "*.html"

# 4. Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name greenflow-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

#### CloudFront Configuration (cloudfront-distribution.json)

```json
{
  "DistributionConfig": {
    "DefaultRootObject": "index.html",
    "DefaultCacheBehavior": {
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "CacheBehaviors": [
      {
        "PathPattern": "/assets/*",
        "ViewerProtocolPolicy": "https-only",
        "CachePolicyId": "86e306c5-14e3-4e7e-90f2-339e0d8f20a3"
      }
    ],
    "ErrorResponses": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  }
}
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The repository includes `.github/workflows/ci-cd.yml` with:

1. **Lint & Type Check** - ESLint + TypeScript compilation
2. **E2E Smoke Tests** - Playwright tests on real browser
3. **LocalStack Integration Tests** - AWS service integration tests
4. **Build & Bundle Analysis** - Production bundle verification
5. **Security Scan** - npm audit for vulnerabilities
6. **Deploy Preview** - Auto-deploy to staging on `develop` push
7. **Deploy Production** - Auto-deploy to production on `main` push

### Running CI/CD Manually

```bash
# Trigger tests locally
npm run lint
npm run build
npm run test:e2e
npm run test:e2e:dashboard

# Or use act (local GitHub Actions runner)
npm install -g act
act push  # Simulate push event
act pull_request  # Simulate PR event
```

---

## Post-Deployment

### 1. Health Checks

```bash
# Check if app is running
curl -I https://greenflow.dev

# Verify API connectivity
curl https://greenflow.dev/api/health

# Check assets are cached properly
curl -I https://greenflow.dev/assets/index-*.js
```

### 2. Monitoring Setup

#### Sentry (Error Tracking)

```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV,
    tracesSampleRate: import.meta.env.VITE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
```

#### Google Analytics

```typescript
// src/main.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <YourApp />
      {import.meta.env.VITE_ENV === 'production' && <Analytics />}
    </>
  );
}
```

### 3. Performance Monitoring

#### Lighthouse CI

```bash
# Install Lighthouse CI
npm install -g @lhci/cli@latest

# Configure (lhci.config.js)
module.exports = {
  ci: {
    collect: {
      url: ['https://greenflow.dev'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

# Run
lhci autorun
```

### 4. Uptime Monitoring

```bash
# Set up with Pingdom or Better Uptime
# Monitor endpoints:
# - https://greenflow.dev (homepage)
# - https://greenflow.dev/shipper (shipper landing)
# - https://greenflow.dev/login (login page)
```

---

## Performance Optimization

### Current Issues

1. **Bundle Size > 500 kB** - Exceeds target by 297.6 kB
2. **No code splitting** - All code in single bundle
3. **Large vendor chunk** - React ecosystem not optimized

### Solutions to Implement

#### 1. Enable Code Splitting

```bash
# Use vite.config.performance.ts
mv vite.config.ts vite.config.ts.backup
cp vite.config.performance.ts vite.config.ts
npm run build
```

#### 2. Lazy Load Routes

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ShipperDashboard = lazy(() => import('./pages/dashboards/ShipperDashboard'));

// In routes
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/login" element={<Login />} />
</Suspense>
```

#### 3. Optimize Images

```bash
# Install image optimization
npm install --save-dev @vitejs/plugin-legacy imagemin

# Use WebP format
# <img src="image.webp" alt="..." />
```

#### 4. Remove Unused Dependencies

```bash
npm audit
npm dedupe
```

---

## Troubleshooting

### Issue 1: Bundle Size Warning

**Error**: "Some chunks are larger than 500 kB"

**Solution**:
```bash
# Enable code splitting
npm run build -- --config vite.config.performance.ts

# Analyze bundle
npm run build
# Check dist/stats.html
```

### Issue 2: API Connection Failures

**Error**: "Failed to fetch from API"

**Solution**:
```env
# Check environment variable
VITE_API_BASE_URL=https://api.greenflow.dev/api/v2

# Verify CORS headers on backend
curl -I https://api.greenflow.dev
```

### Issue 3: Slow Page Load

**Error**: Page takes >3 seconds to load

**Solution**:
```bash
# Run Lighthouse CI
lhci autorun

# Check:
# 1. Network tab (large assets?)
# 2. Performance tab (rendering issues?)
# 3. Cache headers (static assets cached?)
```

### Issue 4: Login Redirect Loop

**Error**: Stuck on login page after successful auth

**Solution**:
```typescript
// Check AuthContext redirect logic
// Ensure token is persisted to localStorage
// Verify /dashboard/shipper route exists
```

---

## Rollback Procedure

### Vercel Rollback

```bash
# View deployments
vercel list

# Rollback to previous deployment
vercel promote <deployment-url>
```

### Netlify Rollback

```bash
# View deployments
netlify deploys:list

# Rollback
netlify deploy --alias=<previous-deployment>
```

### AWS S3 Rollback

```bash
# Restore from S3 versioning
aws s3api list-object-versions \
  --bucket greenflow-frontend \
  --prefix "index.html"

# Restore specific version
aws s3api get-object \
  --bucket greenflow-frontend \
  --key "index.html" \
  --version-id "VERSION_ID" \
  index.html
```

---

## Security Checklist

- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] CSP headers configured
- [ ] XSS protection enabled
- [ ] CORS properly configured
- [ ] No sensitive data in client code
- [ ] Dependencies up to date
- [ ] Secrets stored in environment variables
- [ ] HSTS header enabled
- [ ] X-Frame-Options set
- [ ] No debug/console logs in production

---

## Monitoring Dashboards

### Recommended Tools

1. **Sentry** - Error tracking & monitoring
2. **Vercel Analytics** or **Google Analytics** - User analytics
3. **Lighthouse CI** - Performance monitoring
4. **StatusPage** - Public status monitoring
5. **DataDog** - Infrastructure monitoring (if needed)

### Key Metrics to Monitor

| Metric | Target | Tool |
|--------|--------|------|
| Error Rate | < 0.1% | Sentry |
| P95 Response | < 1 second | Vercel |
| P99 Response | < 3 seconds | Vercel |
| Lighthouse Performance | > 90 | Lighthouse CI |
| Uptime | > 99.9% | Better Uptime |

---

## Contacts & Escalation

| Issue | Responsible | Escalation |
|-------|-------------|-----------|
| Deployment | DevOps | CTO |
| Performance | Frontend Lead | VP Engineering |
| Security | Security Lead | CTO |
| Downtime | On-call Engineer | Engineering Manager |

---

## Next Steps

1. **Complete bundle optimization** (target < 400 kB)
2. **Set up monitoring dashboards**
3. **Create runbooks for common issues**
4. **Schedule performance review (monthly)**
5. **Implement A/B testing framework**
6. **Plan mobile app deployment (native or React Native)**

---

**Last Reviewed**: 2026-02-04
**Next Review**: 2026-03-04
