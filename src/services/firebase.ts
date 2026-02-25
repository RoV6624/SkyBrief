// Firebase Auth service
// NOTE: Requires GoogleService-Info.plist in ios/ directory
// User must create a Firebase project and download the config file

import auth, { type FirebaseAuthTypes } from "@react-native-firebase/auth";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import type {
  ApiFuelPriceResponse,
  CombinedFuelPrice,
  FuelPriceData,
  FuelPriceReport,
  AirportFuelPrices,
} from "@/lib/api/types";
import type { PersonalMinimums } from "@/lib/minimums/types";
import { validateIcao } from "@/lib/validation/icao";
import { validateFuelPrice, validateFboName } from "@/lib/validation/fuel-price";
import { FUEL_PRICE_DEFAULTS } from "@/config/defaults";

// ── Safe Auth Accessors ─────────────────────────────────────────────────────

function getAuth(): ReturnType<typeof auth> | null {
  try {
    return auth();
  } catch (e) {
    console.error("[Firebase] Auth not available. Error:", e);
    console.error("[Firebase] Auth module type:", typeof auth);
    return null;
  }
}

export function safeCurrentUser(): FirebaseAuthTypes.User | null {
  return getAuth()?.currentUser ?? null;
}

// Initialize Google Sign-In
// Web Client ID is loaded from environment variables for security
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let googleSignInConfigured = false;

async function ensureGoogleSignInConfigured(): Promise<void> {
  if (googleSignInConfigured) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured. Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
  }
  await GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
  googleSignInConfigured = true;
}

export async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
  await ensureGoogleSignInConfigured();
  await GoogleSignin.hasPlayServices();
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult?.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In failed: no ID token");
  }
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const a = getAuth();
  if (!a) throw new Error("Firebase Auth is not available.");
  return a.signInWithCredential(googleCredential);
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthTypes.UserCredential> {
  const a = getAuth();
  if (!a) throw new Error("Firebase Auth is not available.");
  return a.signInWithEmailAndPassword(email, password);
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthTypes.UserCredential> {
  const a = getAuth();
  if (!a) throw new Error("Firebase Auth is not available.");
  return a.createUserWithEmailAndPassword(email, password);
}

export async function resetPassword(email: string): Promise<void> {
  const a = getAuth();
  if (!a) throw new Error("Firebase Auth is not available.");
  return a.sendPasswordResetEmail(email);
}

export async function firebaseSignOut(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google sign out may fail if user used email auth
  }
  const a = getAuth();
  if (a) await a.signOut();
}

/**
 * Delete the current user's account.
 * 1. Deletes user profile from Firestore
 * 2. Deletes Firebase Auth account
 * Throws auth/requires-recent-login if the user hasn't authenticated recently.
 */
export async function deleteAccount(): Promise<void> {
  const currentUser = safeCurrentUser();
  if (!currentUser) {
    throw new Error("No authenticated user found.");
  }

  // Delete Firestore user profile
  if (PROJECT_ID) {
    try {
      const idToken = await currentUser.getIdToken();
      const docUrl = `${FIRESTORE_API_URL}/users/${currentUser.uid}`;
      await fetch(docUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
    } catch (e) {
      console.warn("[Firebase] Failed to delete Firestore profile:", e);
    }
  }

  // Delete Firebase Auth account
  await currentUser.delete();
}

/**
 * Re-authenticate with email/password before sensitive operations (e.g., account deletion).
 */
export async function reauthenticateWithEmail(password: string): Promise<void> {
  const currentUser = safeCurrentUser();
  if (!currentUser || !currentUser.email) {
    throw new Error("No authenticated email user found.");
  }
  const credential = auth.EmailAuthProvider.credential(
    currentUser.email,
    password
  );
  await currentUser.reauthenticateWithCredential(credential);
}

/**
 * Re-authenticate with Google before sensitive operations (e.g., account deletion).
 */
export async function reauthenticateWithGoogle(): Promise<void> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured.");
  }
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult?.data?.idToken;
  if (!idToken) {
    throw new Error("Google re-authentication failed: no ID token");
  }
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const currentUser = safeCurrentUser();
  if (!currentUser) {
    throw new Error("No authenticated user found.");
  }
  await currentUser.reauthenticateWithCredential(googleCredential);
}

export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void
) {
  try {
    return auth().onAuthStateChanged(callback);
  } catch (e) {
    console.warn("[Firebase] Auth not available (missing GoogleService-Info.plist?) — running without auth.", e);
    // Immediately report no user so the app can continue unauthenticated
    callback(null);
    // Return a no-op unsubscribe function
    return () => {};
  }
}

/**
 * Re-authenticates the current email/password user, then updates their password.
 * Throws auth/wrong-password if currentPassword is incorrect.
 * Throws auth/requires-recent-login for OAuth users (Google Sign-In).
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const currentUser = safeCurrentUser();
  if (!currentUser || !currentUser.email) {
    throw new Error("No authenticated email user found.");
  }
  const credential = auth.EmailAuthProvider.credential(
    currentUser.email,
    currentPassword
  );
  await currentUser.reauthenticateWithCredential(credential);
  await currentUser.updatePassword(newPassword);
}

/**
 * Returns the current user's Firebase ID token, or null if not authenticated.
 */
export async function getCurrentIdToken(): Promise<string | null> {
  try {
    const user = safeCurrentUser();
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export { statusCodes };

// ────────────────────────────────────────────────────────────────────────────────
// Firestore Service (merged from firestore.ts)
// ────────────────────────────────────────────────────────────────────────────────

// Firebase project configuration - loaded from environment variables for security
const PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

if (!PROJECT_ID) {
  console.warn(
    "[Firebase] EXPO_PUBLIC_FIREBASE_PROJECT_ID not set — Firestore disabled."
  );
}

export const FIRESTORE_API_URL = PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : "";

function assertFirestoreEnabled(): void {
  if (!FIRESTORE_API_URL) throw new Error("Firestore disabled: EXPO_PUBLIC_FIREBASE_PROJECT_ID not set");
}

// ─── User Profile Types ────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  homeAirport: string;
  experienceLevel: "student" | "private" | "commercial" | "atp" | "instructor";
  defaultAircraft: string;
  onboardingComplete: boolean;
  minimumsEnabled?: boolean;
  personalMinimums?: PersonalMinimums;
  role?: import("@/lib/auth/roles").UserRole;
  lastActiveAt?: Date;
  timezone?: string;
  dailyBriefingEnabled?: boolean;
  pushToken?: string;
  assignedInstructorUid?: string;
  assignedInstructorName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Fuel Price Helpers ────────────────────────────────────────────────────

const STALE_MS = FUEL_PRICE_DEFAULTS.staleThresholdDays * 24 * 60 * 60 * 1000;

export function isFuelPriceStale(data: FuelPriceData): boolean {
  return Date.now() - data.updated_at.getTime() > STALE_MS;
}

// ─── Firestore REST API Helpers ────────────────────────────────────────────

export function firestoreValueToJS(value: any): any {
  if (value == null) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue, 10);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.arrayValue !== undefined) {
    return (value.arrayValue.values ?? []).map(firestoreValueToJS);
  }
  if (value.mapValue !== undefined) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value.mapValue.fields || {})) result[key] = firestoreValueToJS(val);
    return result;
  }
  if (value.nullValue !== undefined) return null;
  return null;
}

export function jsToFirestoreValue(value: any): any {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(jsToFirestoreValue) } };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: value.toString() };
    return { doubleValue: value };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "object" && value !== null) {
    const fields: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) fields[key] = jsToFirestoreValue(val);
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getFuelPrice(icao: string): Promise<FuelPriceData | null> {
  try {
    assertFirestoreEnabled();
    const currentUser = safeCurrentUser();
    const headers: Record<string, string> = {};
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }
    const docUrl = `${FIRESTORE_API_URL}/fuel_prices/${icao.toUpperCase()}`;
    const response = await fetch(docUrl, { headers });

    if (response.status === 404) {
      return null; // Document doesn't exist
    }

    if (!response.ok) {
      // 403 is expected when Firestore Security Rules not configured for public read
      // Silently handle this case to avoid console clutter
      if (response.status !== 403) {
        console.error("[Firestore] Failed to fetch fuel price:", response.status);
      }
      return null;
    }

    const data = await response.json();
    const fields = data.fields || {};

    const updatedAtValue = fields.updated_at;
    const updatedAt: Date = updatedAtValue
      ? firestoreValueToJS(updatedAtValue)
      : new Date(0);

    return {
      airport_id: firestoreValueToJS(fields.airport_id) || icao.toUpperCase(),
      price_100ll: firestoreValueToJS(fields.price_100ll) || 0,
      updated_at: updatedAt,
      updated_by_uid: firestoreValueToJS(fields.updated_by_uid) || "",
      fbo_name: firestoreValueToJS(fields.fbo_name),
    };
  } catch (error) {
    console.error("[Firestore] Error fetching fuel price:", error);
    return null;
  }
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

const submitHistory = new Map<string, number>();
const RATE_LIMIT_MS = FUEL_PRICE_DEFAULTS.rateLimitMs;

function checkRateLimit(uid: string): void {
  const lastSubmit = submitHistory.get(uid);
  const now = Date.now();

  if (lastSubmit && now - lastSubmit < RATE_LIMIT_MS) {
    const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastSubmit)) / 1000);
    throw new Error(`Rate limit: Please wait ${waitTime} seconds before submitting again.`);
  }

  submitHistory.set(uid, now);
}

// ─── Input Validation ──────────────────────────────────────────────────────

function validateFuelPriceInput(icao: string, price: number, fboName: string, uid: string): void {
  // Validate ICAO code
  const icaoResult = validateIcao(icao);
  if (!icaoResult.valid) {
    throw new Error(icaoResult.error || "Invalid ICAO code");
  }

  // Validate price
  const priceResult = validateFuelPrice(price);
  if (!priceResult.valid) {
    throw new Error(priceResult.error || "Invalid price");
  }

  // Validate FBO name
  const fboResult = validateFboName(fboName);
  if (!fboResult.valid) {
    throw new Error(fboResult.error || "Invalid FBO name");
  }

  // Validate UID
  if (!uid || uid.trim().length === 0) {
    throw new Error("User ID required");
  }

  if (uid.length > 128) {
    throw new Error("Invalid user ID");
  }
}

// ─── Write ─────────────────────────────────────────────────────────────────

export async function submitFuelPrice(
  icao: string,
  price: number,
  fboName: string,
  uid: string
): Promise<void> {
  console.log("[Firestore] Submitting fuel price:", { icao, price, fboName: fboName.substring(0, 20), uid: uid.substring(0, 8) });

  // Security: Rate limiting
  checkRateLimit(uid);

  // Security: Input validation
  validateFuelPriceInput(icao, price, fboName, uid);

  try {
    assertFirestoreEnabled();

    // Get Firebase Auth ID token for authentication
    const currentUser = safeCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await currentUser.getIdToken();
    console.log("[Firestore] Got auth token");

    const docUrl = `${FIRESTORE_API_URL}/fuel_prices/${icao.toUpperCase()}`;

    const firestoreDoc = {
      fields: {
        airport_id: jsToFirestoreValue(icao.toUpperCase()),
        price_100ll: jsToFirestoreValue(price),
        updated_at: jsToFirestoreValue(new Date()),
        updated_by_uid: jsToFirestoreValue(uid),
        fbo_name: jsToFirestoreValue(fboName.trim() || null),
      },
    };

    const response = await fetch(`${docUrl}?updateMask.fieldPaths=airport_id&updateMask.fieldPaths=price_100ll&updateMask.fieldPaths=updated_at&updateMask.fieldPaths=updated_by_uid&updateMask.fieldPaths=fbo_name`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Firestore] Failed to submit:", response.status, error);
      throw new Error(`Failed to submit fuel price: ${response.status}`);
    }

    console.log("[Firestore] Fuel price submitted successfully");
  } catch (error) {
    console.error("[Firestore] Error submitting fuel price:", error);
    throw error;
  }
}

// ─── Enhanced Multi-Report Fuel Price System ───────────────────────────────

/**
 * Submit a new fuel price report (doesn't replace existing)
 * Creates a new document in the fuel_prices/{icao}/reports subcollection
 */
export async function submitFuelPriceReport(
  icao: string,
  price: number,
  fboName: string,
  uid: string
): Promise<string> {
  console.log("[Firestore] Submitting new fuel price report:", { icao, price, fboName, uid: uid.substring(0, 8) });

  // Security: Rate limiting
  checkRateLimit(uid);

  // Security: Input validation
  validateFuelPriceInput(icao, price, fboName, uid);

  try {
    assertFirestoreEnabled();

    const currentUser = safeCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await currentUser.getIdToken();

    // Use Firestore auto-generated ID for new report
    const reportId = generateFirestoreId();
    const docUrl = `${FIRESTORE_API_URL}/fuel_prices/${icao.toUpperCase()}/reports/${reportId}`;

    const firestoreDoc = {
      fields: {
        airport_id: jsToFirestoreValue(icao.toUpperCase()),
        price_100ll: jsToFirestoreValue(price),
        fbo_name: jsToFirestoreValue(fboName.trim() || null),
        reported_at: jsToFirestoreValue(new Date()),
        reported_by_uid: jsToFirestoreValue(uid),
        upvotes: jsToFirestoreValue(0),
        flags: jsToFirestoreValue(0),
        verified_by_uids: jsToFirestoreValue([]),
        flagged_by_uids: jsToFirestoreValue([]),
      },
    };

    const response = await fetch(docUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Firestore] Failed to submit report:", response.status, error);
      throw new Error(`Failed to submit fuel price report: ${response.status}`);
    }

    console.log("[Firestore] Fuel price report submitted successfully:", reportId);
    submitHistory.set(uid, Date.now()); // Update rate limit

    return reportId;
  } catch (error) {
    console.error("[Firestore] Error submitting fuel price report:", error);
    throw error;
  }
}

/**
 * Get all fuel price reports for an airport
 */
export async function getFuelPriceReports(icao: string): Promise<FuelPriceReport[]> {
  try {
    assertFirestoreEnabled();
    // Query subcollection: fuel_prices/{icao}/reports
    const currentUser = safeCurrentUser();
    const headers: Record<string, string> = {};
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }
    const collectionUrl = `${FIRESTORE_API_URL}/fuel_prices/${icao.toUpperCase()}/reports`;

    const response = await fetch(collectionUrl, { headers });

    if (response.status === 404) {
      return []; // No reports for this airport
    }

    if (!response.ok) {
      if (response.status !== 403) {
        console.error("[Firestore] Failed to fetch reports:", response.status);
      }
      return [];
    }

    const data = await response.json();
    const documents = data.documents || [];

    const reports: FuelPriceReport[] = documents.map((doc: any) => {
      const fields = doc.fields || {};
      const id = doc.name.split('/').pop() || '';

      return {
        id,
        airport_id: firestoreValueToJS(fields.airport_id) || icao.toUpperCase(),
        price_100ll: firestoreValueToJS(fields.price_100ll) || 0,
        fbo_name: firestoreValueToJS(fields.fbo_name),
        reported_at: firestoreValueToJS(fields.reported_at) || new Date(0),
        reported_by_uid: firestoreValueToJS(fields.reported_by_uid) || '',
        upvotes: firestoreValueToJS(fields.upvotes) || 0,
        flags: firestoreValueToJS(fields.flags) || 0,
        verified_by_uids: firestoreValueToJS(fields.verified_by_uids) || [],
        flagged_by_uids: firestoreValueToJS(fields.flagged_by_uids) || [],
      };
    });

    return reports;
  } catch (error) {
    console.warn("[Firestore] Error fetching fuel price reports:", error);
    return [];
  }
}

/**
 * Upvote a fuel price report
 */
export async function upvoteFuelReport(
  icao: string,
  reportId: string,
  uid: string
): Promise<void> {
  try {
    assertFirestoreEnabled();
    const currentUser = safeCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await currentUser.getIdToken();
    const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/fuel_prices/${icao.toUpperCase()}/reports/${reportId}`;
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

    const response = await fetch(commitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: docPath,
              fieldTransforms: [
                {
                  fieldPath: "upvotes",
                  increment: { integerValue: "1" },
                },
                {
                  fieldPath: "verified_by_uids",
                  appendMissingElements: {
                    values: [{ stringValue: uid }],
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to upvote report");
    }

    console.log("[Firestore] Report upvoted successfully");
  } catch (error) {
    console.error("[Firestore] Error upvoting report:", error);
    throw error;
  }
}

/**
 * Flag a fuel price report as outdated/incorrect
 */
export async function flagFuelReport(
  icao: string,
  reportId: string,
  uid: string
): Promise<void> {
  try {
    assertFirestoreEnabled();
    const currentUser = safeCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await currentUser.getIdToken();
    const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/fuel_prices/${icao.toUpperCase()}/reports/${reportId}`;
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`;

    const response = await fetch(commitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        writes: [
          {
            transform: {
              document: docPath,
              fieldTransforms: [
                {
                  fieldPath: "flags",
                  increment: { integerValue: "1" },
                },
                {
                  fieldPath: "flagged_by_uids",
                  appendMissingElements: {
                    values: [{ stringValue: uid }],
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to flag report");
    }

    console.log("[Firestore] Report flagged successfully");
  } catch (error) {
    console.error("[Firestore] Error flagging report:", error);
    throw error;
  }
}

/**
 * Generate a Firestore-compatible document ID
 * Uses same format as Firestore auto-IDs (20 characters)
 */
function generateFirestoreId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(bytes[i] % chars.length);
  }
  return id;
}

// ─── User Profile CRUD ─────────────────────────────────────────────────────

/**
 * Load user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    assertFirestoreEnabled();
    // Get Firebase Auth ID token for authentication
    const currentUser = safeCurrentUser();
    if (!currentUser) {
      console.log("[Firestore] No authenticated user for profile fetch");
      return null;
    }

    const idToken = await currentUser.getIdToken();
    const docUrl = `${FIRESTORE_API_URL}/users/${uid}`;

    const response = await fetch(docUrl, {
      headers: {
        "Authorization": `Bearer ${idToken}`,
      },
    });

    if (response.status === 404) {
      console.log("[Firestore] No user profile found for:", uid);
      return null; // User profile doesn't exist yet
    }

    if (!response.ok) {
      // Log ALL errors including 403 to help debug
      const errorText = await response.text();
      console.error("[Firestore] Failed to fetch user profile:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const fields = data.fields || {};

    // Deserialize personalMinimums from individual fields
    const personalMinimums: PersonalMinimums | undefined =
      fields.minimums_ceiling
        ? {
            ceiling: firestoreValueToJS(fields.minimums_ceiling) ?? 3000,
            visibility: firestoreValueToJS(fields.minimums_visibility) ?? 5,
            crosswind: firestoreValueToJS(fields.minimums_crosswind) ?? 15,
            maxWind: firestoreValueToJS(fields.minimums_maxWind) ?? 25,
            maxGust: firestoreValueToJS(fields.minimums_maxGust) ?? 25,
          }
        : undefined;

    return {
      uid: firestoreValueToJS(fields.uid) || uid,
      name: firestoreValueToJS(fields.name) || "",
      email: firestoreValueToJS(fields.email) || "",
      homeAirport: firestoreValueToJS(fields.homeAirport) || "",
      experienceLevel: firestoreValueToJS(fields.experienceLevel) || "private",
      defaultAircraft: firestoreValueToJS(fields.defaultAircraft) || "c172s",
      onboardingComplete: firestoreValueToJS(fields.onboardingComplete) || false,
      minimumsEnabled:
        fields.minimumsEnabled !== undefined
          ? firestoreValueToJS(fields.minimumsEnabled)
          : undefined,
      personalMinimums,
      role: firestoreValueToJS(fields.role) || undefined,
      lastActiveAt: fields.lastActiveAt
        ? firestoreValueToJS(fields.lastActiveAt)
        : undefined,
      assignedInstructorUid: firestoreValueToJS(fields.assignedInstructorUid) || undefined,
      assignedInstructorName: firestoreValueToJS(fields.assignedInstructorName) || undefined,
      createdAt: firestoreValueToJS(fields.createdAt) || new Date(),
      updatedAt: firestoreValueToJS(fields.updatedAt) || new Date(),
    };
  } catch (error) {
    console.error("[Firestore] Error fetching user profile:", error);
    return null;
  }
}

/**
 * Save user profile to Firestore
 */
export async function saveUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
  try {
    assertFirestoreEnabled();

    const currentUser = safeCurrentUser();
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await currentUser.getIdToken();
    const now = new Date();

    // Build only the fields that are provided (PATCH with updateMask)
    const fields: Record<string, any> = {
      uid: jsToFirestoreValue(profile.uid),
      updatedAt: jsToFirestoreValue(now),
    };
    const fieldPaths: string[] = ["uid", "updatedAt"];

    // Always set createdAt on write — Firestore updateMask will create it on
    // first save and leave it unchanged on subsequent saves because it's the
    // same value being read back. We use a server-roundtrip-free approach:
    // include createdAt only if this is a new profile (onboardingComplete being set).
    if (profile.onboardingComplete !== undefined) {
      fields.createdAt = jsToFirestoreValue(now);
      fieldPaths.push("createdAt");
    }

    const optionalFields: Array<[keyof UserProfile, any]> = [
      ["name", profile.name],
      ["email", profile.email],
      ["homeAirport", profile.homeAirport],
      ["experienceLevel", profile.experienceLevel],
      ["defaultAircraft", profile.defaultAircraft],
      ["onboardingComplete", profile.onboardingComplete],
      ["minimumsEnabled", profile.minimumsEnabled],
      ["role", profile.role],
      ["timezone", profile.timezone],
      ["dailyBriefingEnabled", profile.dailyBriefingEnabled],
      ["pushToken", profile.pushToken],
      ["assignedInstructorUid", profile.assignedInstructorUid],
      ["assignedInstructorName", profile.assignedInstructorName],
    ];

    for (const [key, value] of optionalFields) {
      if (value !== undefined) {
        fields[key] = jsToFirestoreValue(value);
        fieldPaths.push(key);
      }
    }

    if (profile.personalMinimums) {
      const mins = profile.personalMinimums;
      fields.minimums_ceiling = jsToFirestoreValue(mins.ceiling);
      fields.minimums_visibility = jsToFirestoreValue(mins.visibility);
      fields.minimums_crosswind = jsToFirestoreValue(mins.crosswind);
      fields.minimums_maxWind = jsToFirestoreValue(mins.maxWind);
      fields.minimums_maxGust = jsToFirestoreValue(mins.maxGust);
      fieldPaths.push("minimums_ceiling", "minimums_visibility", "minimums_crosswind", "minimums_maxWind", "minimums_maxGust");
    }

    const mask = fieldPaths.map((f) => `updateMask.fieldPaths=${f}`).join("&");
    const docUrl = `${FIRESTORE_API_URL}/users/${profile.uid}?${mask}`;

    const response = await fetch(docUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Firestore] Failed to save user profile:", response.status, error);
      throw new Error(`Failed to save user profile: ${response.status}`);
    }

    console.log("[Firestore] User profile saved successfully");
  } catch (error) {
    console.error("[Firestore] Error saving user profile:", error);
    throw error;
  }
}

// ─── Merge ─────────────────────────────────────────────────────────────────

export function mergeFuelPrices(
  icao: string,
  apiPrice: ApiFuelPriceResponse | null,
  userPrice: FuelPriceData | null
): CombinedFuelPrice | null {
  // No data from either source
  if (!apiPrice && !userPrice) return null;

  // Only API data
  if (apiPrice && !userPrice) {
    return {
      price_100ll: apiPrice.price,
      fbo_name: apiPrice.fbo_name,
      updated_at: new Date(apiPrice.updated_at),
      source: "api",
      api_data: apiPrice,
      confidence: "high",
    };
  }

  // Only user data
  if (userPrice && !apiPrice) {
    return {
      price_100ll: userPrice.price_100ll,
      fbo_name: userPrice.fbo_name,
      updated_at: userPrice.updated_at,
      source: "user",
      user_data: userPrice,
      confidence: isFuelPriceStale(userPrice) ? "low" : "medium",
    };
  }

  // Both sources exist - intelligent merge
  const apiDate = new Date(apiPrice!.updated_at);
  const userDate = userPrice!.updated_at;
  const priceDiff = Math.abs(apiPrice!.price - userPrice!.price_100ll);

  // If prices diverge significantly, show merged state
  if (priceDiff > 0.5) {
    return {
      price_100ll: apiDate > userDate ? apiPrice!.price : userPrice!.price_100ll,
      fbo_name: apiDate > userDate ? apiPrice!.fbo_name : userPrice!.fbo_name,
      updated_at: apiDate > userDate ? apiDate : userDate,
      source: "merged",
      api_data: apiPrice!,
      user_data: userPrice!,
      confidence: "low", // Divergent prices = low confidence
    };
  }

  // Prices agree - use fresher source
  if (apiDate > userDate) {
    return {
      price_100ll: apiPrice!.price,
      fbo_name: apiPrice!.fbo_name,
      updated_at: apiDate,
      source: "api",
      api_data: apiPrice!,
      confidence: "high",
    };
  } else {
    return {
      price_100ll: userPrice!.price_100ll,
      fbo_name: userPrice!.fbo_name,
      updated_at: userDate,
      source: "user",
      user_data: userPrice!,
      confidence: "medium",
    };
  }
}
