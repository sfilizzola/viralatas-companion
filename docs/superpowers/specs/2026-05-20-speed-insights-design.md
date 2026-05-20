# Design: Vercel Speed Insights Integration

**Date:** 2026-05-20
**Phase:** 22
**Status:** Approved

---

## Goal

Surface real-user performance data (Core Web Vitals) per route to detect slow page loads and rendering problems that users face in production. This is a performance observability concern, not behavioral analytics.

---

## Scope

- Install `@vercel/speed-insights`
- Mount `<SpeedInsights />` in `App.tsx`
- No Service Worker changes required

Out of scope: behavioral analytics, custom events, error tracking (Sentry deferred to a future phase).

---

## Architecture

### Package

`@vercel/speed-insights` is a production dependency. It provides:
- `<SpeedInsights />` React component (for `@vercel/speed-insights/react`)
- Automatic route change detection via the History API — compatible with react-router-dom
- Production-only activation (no-ops in dev builds)
- Beacon POSTs to `/_vercel/insights/vitals`

### Metrics tracked

Vercel Speed Insights collects the full set of Core Web Vitals from real users:

| Metric | What it measures |
|--------|-----------------|
| LCP (Largest Contentful Paint) | Perceived load speed — largest element visible |
| CLS (Cumulative Layout Shift) | Visual stability — unexpected layout shifts |
| INP (Interaction to Next Paint) | Responsiveness — delay between input and paint |
| FCP (First Contentful Paint) | Time until first content is rendered |
| TTFB (Time to First Byte) | Server/network response time |

Data is segmented by route, device type, and country in the Vercel dashboard.

### Integration point

`<SpeedInsights />` is mounted once at the top of `App.tsx`, inside `<BrowserRouter>` and `<DuckEnabledProvider>`, before any sync components. Position is not critical for correctness but placing it first ensures it initializes early.

### Service Worker compatibility

The SW (`src/workers/sw.ts`) registers explicit hostname-scoped routes only (Supabase and Wacken CDN). No catch-all is registered. Workbox's precache layer does not intercept POST requests. Speed Insights beacon POSTs to `/_vercel/insights/vitals` will therefore pass through the SW to the network unmodified. **No SW changes are needed.**

### Vercel dashboard

Speed Insights must be enabled once in the Vercel project dashboard (Project → Speed Insights → Enable). This is a manual one-time step already completed by the team lead.

---

## Changes

| File | Change |
|------|--------|
| `package.json` | Add `@vercel/speed-insights` as production dependency |
| `src/App.tsx` | Import and mount `<SpeedInsights />` inside `App()` |

No migrations, no Edge Function changes, no SW changes.

---

## Testing

- Build must pass (`npm run build`)
- Tests must pass (`npm test`)
- In production, the Vercel Speed Insights dashboard should show route-level data after real user visits
- In development, the component is a no-op — no network requests to `/_vercel/insights/` should appear in DevTools

---

## Non-goals

- Custom event tracking (requires Vercel Pro)
- Error/crash tracking (Sentry, deferred)
- Component-level profiling with `performance.mark()` (not needed for current goals)
- Any changes to offline behavior or sync architecture
