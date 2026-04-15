/**
 * ALLOUL&Q — Sentry (disabled)
 * ----------------------------
 * @sentry/react-native was removed on 2026-04-15 because versions 6.x and 8.x
 * both fail to compile against Hermes in RN 0.81.5 (enableSamplingProfiler /
 * dumpSampledTraceToStream + NSData file-reader issues in RNSentry.mm).
 *
 * This module is kept as a no-op stub so existing call sites (`initSentry`,
 * `captureException`) keep compiling. Crash reporting can be re-added later
 * once Sentry ships a release that supports the current RN version, or via
 * an alternative provider (Bugsnag, Crashlytics).
 */

export function initSentry(): void {
  // intentionally empty
}

export function captureException(_error: unknown, _context?: Record<string, any>): void {
  // intentionally empty
}
