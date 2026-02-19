// Admin data-fetching functions for the analytics dashboard
// All functions require admin auth — caller must verify isAdmin before invoking

import {
  FIRESTORE_API_URL,
  firestoreValueToJS,
  safeCurrentUser,
  type UserProfile,
} from "@/services/firebase";

// ── Types ───────────────────────────────────────────────────────────────────

export interface DailyMetrics {
  date: string;
  briefings: number;
  routes: number;
  wb_calculations: number;
  chart_views: number;
  fuel_lookups: number;
  notam_views: number;
}

export interface AirportMetrics {
  [icao: string]: number;
}

export interface RetentionMetrics {
  dau: number;
  wau: number;
  mau: number;
}

export interface AdminUserSummary {
  total: number;
  new7d: number;
  new30d: number;
  studentPercent: number;
  users: UserProfile[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = safeCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");
  const idToken = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

// ── Fetch Users ─────────────────────────────────────────────────────────────

export async function fetchAllUsers(): Promise<AdminUserSummary> {
  const headers = await getAuthHeaders();

  // Firestore REST: list documents in users collection
  let allUsers: UserProfile[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = nextPageToken
      ? `${FIRESTORE_API_URL}/users?pageSize=100&pageToken=${nextPageToken}`
      : `${FIRESTORE_API_URL}/users?pageSize=100`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[admin-api] fetchAllUsers failed: ${res.status}`, body);
      throw new Error(`Failed to fetch users: ${res.status}`);
    }

    const data = await res.json();
    const documents = data.documents || [];

    for (const doc of documents) {
      const fields = doc.fields || {};
      allUsers.push({
        uid: firestoreValueToJS(fields.uid) || doc.name.split("/").pop() || "",
        name: firestoreValueToJS(fields.name) || "",
        email: firestoreValueToJS(fields.email) || "",
        homeAirport: firestoreValueToJS(fields.homeAirport) || "",
        experienceLevel: firestoreValueToJS(fields.experienceLevel) || "private",
        defaultAircraft: firestoreValueToJS(fields.defaultAircraft) || "c172s",
        onboardingComplete: firestoreValueToJS(fields.onboardingComplete) || false,
        role: firestoreValueToJS(fields.role) || undefined,
        lastActiveAt: fields.lastActiveAt
          ? firestoreValueToJS(fields.lastActiveAt)
          : undefined,
        createdAt: firestoreValueToJS(fields.createdAt) || new Date(),
        updatedAt: firestoreValueToJS(fields.updatedAt) || new Date(),
      });
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  const now = Date.now();
  const d7 = 7 * 24 * 60 * 60 * 1000;
  const d30 = 30 * 24 * 60 * 60 * 1000;

  const new7d = allUsers.filter(
    (u) => u.createdAt && now - new Date(u.createdAt).getTime() < d7
  ).length;

  const new30d = allUsers.filter(
    (u) => u.createdAt && now - new Date(u.createdAt).getTime() < d30
  ).length;

  const students = allUsers.filter((u) => u.experienceLevel === "student").length;
  const studentPercent = allUsers.length > 0
    ? Math.round((students / allUsers.length) * 100)
    : 0;

  return {
    total: allUsers.length,
    new7d,
    new30d,
    studentPercent,
    users: allUsers,
  };
}

// ── Fetch Daily Metrics ─────────────────────────────────────────────────────

export async function fetchDailyMetrics(days: number): Promise<DailyMetrics[]> {
  const headers = await getAuthHeaders();
  const metrics: DailyMetrics[] = [];

  // Fetch last N days of metrics
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    try {
      const url = `${FIRESTORE_API_URL}/daily_metrics/${dateStr}`;
      const res = await fetch(url, { headers });

      if (res.ok) {
        const data = await res.json();
        const fields = data.fields || {};
        metrics.push({
          date: dateStr,
          briefings: firestoreValueToJS(fields.briefings) ?? 0,
          routes: firestoreValueToJS(fields.routes) ?? 0,
          wb_calculations: firestoreValueToJS(fields.wb_calculations) ?? 0,
          chart_views: firestoreValueToJS(fields.chart_views) ?? 0,
          fuel_lookups: firestoreValueToJS(fields.fuel_lookups) ?? 0,
          notam_views: firestoreValueToJS(fields.notam_views) ?? 0,
        });
      }
    } catch (err) {
      console.error(`[admin-api] fetchDailyMetrics failed for ${dateStr}:`, err);
    }
  }

  return metrics;
}

// ── Fetch Airport Metrics ───────────────────────────────────────────────────

export async function fetchAirportMetrics(): Promise<AirportMetrics> {
  const headers = await getAuthHeaders();
  const url = `${FIRESTORE_API_URL}/metrics/airports`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return {};
    throw new Error(`Failed to fetch airport metrics: ${res.status}`);
  }

  const data = await res.json();
  const fields = data.fields || {};
  const result: AirportMetrics = {};

  for (const [key, val] of Object.entries(fields)) {
    result[key] = firestoreValueToJS(val) ?? 0;
  }

  return result;
}

// ── Compute Retention ───────────────────────────────────────────────────────

export function computeRetention(users: UserProfile[]): RetentionMetrics {
  const now = Date.now();
  const d1 = 24 * 60 * 60 * 1000;
  const d7 = 7 * d1;
  const d30 = 30 * d1;

  let dau = 0;
  let wau = 0;
  let mau = 0;

  for (const user of users) {
    if (!user.lastActiveAt) continue;
    const elapsed = now - new Date(user.lastActiveAt).getTime();
    if (elapsed < d1) dau++;
    if (elapsed < d7) wau++;
    if (elapsed < d30) mau++;
  }

  return { dau, wau, mau };
}
