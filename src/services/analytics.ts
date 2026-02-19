// Analytics service — batched event tracking via Firestore REST API
// Fire-and-forget, never crashes the app

import {
  FIRESTORE_API_URL,
  firestoreValueToJS,
  jsToFirestoreValue,
  safeCurrentUser,
} from "@/services/firebase";

// ── Event Types ─────────────────────────────────────────────────────────────

export type EventType =
  | "briefing"
  | "route"
  | "wb_calculation"
  | "chart_view"
  | "fuel_lookup"
  | "notam_view";

interface AnalyticsEvent {
  type: EventType;
  station?: string;
}

// ── In-Memory Queue ─────────────────────────────────────────────────────────

const eventQueue: Map<EventType, number> = new Map();
let flushTimer: ReturnType<typeof setInterval> | null = null;
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

function ensureFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushEvents().catch(() => {});
  }, FLUSH_INTERVAL_MS);
}

// ── Public API ──────────────────────────────────────────────────────────────

export function stopAnalytics(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  try {
    const count = eventQueue.get(event.type) ?? 0;
    eventQueue.set(event.type, count + 1);
    ensureFlushTimer();

    // Also track airport if provided
    if (event.station) {
      incrementAirportCounter(event.station).catch(() => {});
    }
  } catch {
    // Never crash
  }
}

export async function trackAppOpen(uid: string): Promise<void> {
  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return;

    const idToken = await currentUser.getIdToken();
    const docUrl = `${FIRESTORE_API_URL}/users/${uid}`;

    await fetch(
      `${docUrl}?updateMask.fieldPaths=lastActiveAt`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            lastActiveAt: jsToFirestoreValue(new Date()),
          },
        }),
      }
    );
  } catch {
    // Silent — never block app startup
  }
}

// ── Flush Batched Events ────────────────────────────────────────────────────

async function flushEvents(): Promise<void> {
  if (eventQueue.size === 0) return;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return;

    const idToken = await currentUser.getIdToken();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const docUrl = `${FIRESTORE_API_URL}/daily_metrics/${today}`;

    // Read existing counters
    let existing: Record<string, number> = {};
    try {
      const res = await fetch(docUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fields = data.fields || {};
        for (const [key, val] of Object.entries(fields)) {
          if (key !== "date") {
            existing[key] = firestoreValueToJS(val) ?? 0;
          }
        }
      }
    } catch {
      // Doc may not exist yet — that's fine
    }

    // Merge queued events
    const snapshot = new Map(eventQueue);
    eventQueue.clear();

    const mergedFields: Record<string, any> = {
      date: jsToFirestoreValue(today),
    };
    const fieldPaths = ["date"];

    const allTypes: EventType[] = [
      "briefing", "route", "wb_calculation",
      "chart_view", "fuel_lookup", "notam_view",
    ];

    for (const type of allTypes) {
      const queued = snapshot.get(type) ?? 0;
      const prev = existing[type] ?? 0;
      const pluralKey = type === "wb_calculation" ? "wb_calculations"
        : type === "chart_view" ? "chart_views"
        : type === "fuel_lookup" ? "fuel_lookups"
        : type === "notam_view" ? "notam_views"
        : type === "briefing" ? "briefings"
        : "routes";
      mergedFields[pluralKey] = jsToFirestoreValue((existing[pluralKey] ?? prev) + queued);
      fieldPaths.push(pluralKey);
    }

    const maskParams = fieldPaths
      .map((p) => `updateMask.fieldPaths=${p}`)
      .join("&");

    await fetch(`${docUrl}?${maskParams}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: mergedFields }),
    });
  } catch (err) {
    console.warn("[analytics] flushEvents failed:", err);
  }
}

// ── Airport Counter ─────────────────────────────────────────────────────────

async function incrementAirportCounter(icao: string): Promise<void> {
  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return;

    const idToken = await currentUser.getIdToken();
    const docUrl = `${FIRESTORE_API_URL}/metrics/airports`;
    const cleanIcao = icao.toUpperCase().replace(/[^A-Z0-9]/g, "");

    // Read existing
    let existing: Record<string, number> = {};
    try {
      const res = await fetch(docUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const fields = data.fields || {};
        for (const [key, val] of Object.entries(fields)) {
          existing[key] = firestoreValueToJS(val) ?? 0;
        }
      }
    } catch {
      // Doc may not exist yet
    }

    const newCount = (existing[cleanIcao] ?? 0) + 1;
    existing[cleanIcao] = newCount;

    // Write back only the updated field
    await fetch(
      `${docUrl}?updateMask.fieldPaths=${cleanIcao}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          fields: {
            [cleanIcao]: jsToFirestoreValue(newCount),
          },
        }),
      }
    );
  } catch (err) {
    console.warn("[analytics] incrementAirportCounter failed:", err);
  }
}
