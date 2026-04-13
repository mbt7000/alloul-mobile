/**
 * ALLOUL&Q — Sentry initialization
 * Initializes Sentry for crash reporting, performance, and release tracking.
 * Safe to call when SENTRY_DSN is missing (no-op).
 */

import Constants from "expo-constants";

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  const dsn =
    (Constants.expoConfig?.extra as any)?.sentryDsn ??
    process.env.EXPO_PUBLIC_SENTRY_DSN ??
    "";

  if (!dsn) {
    if (__DEV__) console.log("[Sentry] no DSN configured, skipping");
    return;
  }

  try {
    // Lazy require so missing package doesn't break dev
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/react-native");
    Sentry.init({
      dsn,
      enableAutoSessionTracking: true,
      sessionTrackingIntervalMillis: 30000,
      tracesSampleRate: __DEV__ ? 1.0 : 0.2,
      environment: __DEV__ ? "development" : "production",
      release: `alloul-q@${Constants.expoConfig?.version ?? "1.0.0"}`,
      dist: String(Constants.expoConfig?.ios?.buildNumber ?? "0"),
      beforeSend(event: any) {
        // Scrub auth tokens if they accidentally leak into breadcrumbs
        if (event?.request?.headers?.Authorization) {
          event.request.headers.Authorization = "[redacted]";
        }
        return event;
      },
    });
    if (__DEV__) console.log("[Sentry] initialized");
  } catch (e) {
    if (__DEV__) console.warn("[Sentry] init failed:", e);
  }
}

export function captureException(error: unknown, context?: Record<string, any>): void {
  if (!initialized) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/react-native");
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // no-op
  }
}
