/**
 * Firestore REST API layer for dispatch packets.
 *
 * Follows the same pattern as tenant-api.ts — plain fetch() calls
 * against the Firestore REST endpoint.
 */

import {
  FIRESTORE_API_URL,
  firestoreValueToJS,
  jsToFirestoreValue,
  safeCurrentUser,
} from "./firebase";
import type {
  DispatchPacket,
  DispatchStatus,
  DispatchSteps,
  WBSnapshot,
} from "@/lib/dispatch/types";
import type { ComplianceRecord, GoNoGoResult, FlightType } from "@/lib/briefing/types";
import type { FRATInputs, FRATResult } from "@/lib/frat/types";
import type { NormalizedMetar } from "@/lib/api/types";

// ===== Helpers =====

/** Get authenticated headers for Firestore REST API calls. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = safeCurrentUser();
  if (!currentUser) throw new Error("User not authenticated");
  const idToken = await currentUser.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

/** Validate and sanitize a Firestore document ID to prevent path traversal. */
function sanitizeDocId(id: string): string {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("Invalid document ID");
  }
  return id;
}

function parseDocFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = firestoreValueToJS(value);
  }
  return result;
}

/**
 * Serialize a DispatchPacket into Firestore-compatible field map.
 *
 * Nested objects (briefingRecord, fratResult, etc.) are stored as
 * JSON strings because the Firestore REST API does not natively
 * support deep map types without structured mapValue encoding.
 */
function packetToFields(packet: DispatchPacket): Record<string, any> {
  return {
    studentUid: jsToFirestoreValue(packet.studentUid),
    studentName: jsToFirestoreValue(packet.studentName),
    instructorUid: jsToFirestoreValue(packet.instructorUid),
    instructorName: jsToFirestoreValue(packet.instructorName),
    tenantId: jsToFirestoreValue(packet.tenantId),
    station: jsToFirestoreValue(packet.station),
    stationName: jsToFirestoreValue(packet.stationName),
    flightType: jsToFirestoreValue(packet.flightType),
    status: jsToFirestoreValue(packet.status),
    // Complex nested objects stored as JSON strings
    briefingRecord: jsToFirestoreValue(
      packet.briefingRecord ? JSON.stringify(packet.briefingRecord) : null
    ),
    fratResult: jsToFirestoreValue(
      packet.fratResult ? JSON.stringify(packet.fratResult) : null
    ),
    fratInputs: jsToFirestoreValue(
      packet.fratInputs ? JSON.stringify(packet.fratInputs) : null
    ),
    wbSnapshot: jsToFirestoreValue(
      packet.wbSnapshot ? JSON.stringify(packet.wbSnapshot) : null
    ),
    goNoGoResult: jsToFirestoreValue(
      packet.goNoGoResult ? JSON.stringify(packet.goNoGoResult) : null
    ),
    weatherSnapshot: jsToFirestoreValue(
      packet.weatherSnapshot ? JSON.stringify(packet.weatherSnapshot) : null
    ),
    // Steps stored individually for queryability
    stepBriefing: jsToFirestoreValue(packet.completedSteps.briefing),
    stepFrat: jsToFirestoreValue(packet.completedSteps.frat),
    stepWb: jsToFirestoreValue(packet.completedSteps.wb),
    stepChecklist: jsToFirestoreValue(packet.completedSteps.checklist),
    // Timestamps
    createdAt: jsToFirestoreValue(packet.createdAt),
    submittedAt: jsToFirestoreValue(packet.submittedAt),
    reviewedAt: jsToFirestoreValue(packet.reviewedAt),
    reviewerComment: jsToFirestoreValue(packet.reviewerComment),
    preflightStartedAt: jsToFirestoreValue(packet.preflightStartedAt),
    departedAt: jsToFirestoreValue(packet.departedAt),
  };
}

/**
 * Safely parse a JSON string field, returning null on failure.
 */
function safeJsonParse<T>(value: any): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Convert Firestore document fields back into a DispatchPacket.
 */
function fieldsToPacket(
  id: string,
  fields: Record<string, any>
): DispatchPacket {
  const steps: DispatchSteps = {
    briefing: fields.stepBriefing ?? false,
    frat: fields.stepFrat ?? false,
    wb: fields.stepWb ?? false,
    checklist: fields.stepChecklist ?? false,
  };

  return {
    id,
    studentUid: fields.studentUid ?? "",
    studentName: fields.studentName ?? "Unknown",
    instructorUid: fields.instructorUid ?? "",
    instructorName: fields.instructorName ?? "",
    tenantId: fields.tenantId ?? "",
    station: fields.station ?? "",
    stationName: fields.stationName ?? "",
    flightType: (fields.flightType as FlightType) ?? "local",
    status: (fields.status as DispatchStatus) ?? "draft",
    briefingRecord: safeJsonParse<ComplianceRecord>(fields.briefingRecord),
    fratResult: safeJsonParse<FRATResult>(fields.fratResult),
    fratInputs: safeJsonParse<FRATInputs>(fields.fratInputs),
    wbSnapshot: safeJsonParse<WBSnapshot>(fields.wbSnapshot),
    goNoGoResult: safeJsonParse<GoNoGoResult>(fields.goNoGoResult),
    weatherSnapshot: safeJsonParse<NormalizedMetar>(fields.weatherSnapshot),
    completedSteps: steps,
    createdAt: fields.createdAt ? new Date(fields.createdAt) : new Date(),
    submittedAt: fields.submittedAt ? new Date(fields.submittedAt) : null,
    reviewedAt: fields.reviewedAt ? new Date(fields.reviewedAt) : null,
    reviewerComment: fields.reviewerComment ?? null,
    preflightStartedAt: fields.preflightStartedAt
      ? new Date(fields.preflightStartedAt)
      : null,
    departedAt: fields.departedAt ? new Date(fields.departedAt) : null,
  };
}

// ===== Public API =====

/**
 * Submit a dispatch packet to Firestore.
 * @returns The document ID on success, null on failure.
 */
export async function submitDispatch(
  packet: DispatchPacket
): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/dispatches`;
    const fields = packetToFields(packet);
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const name: string = data.name || "";
    return name.split("/").pop() || null;
  } catch (error) {
    console.error("[DispatchAPI] Failed to submit dispatch:", error);
    return null;
  }
}

/**
 * Fetch all pending dispatches for an instructor within a tenant.
 *
 * "Pending" means status is one of: submitted, revision_requested.
 * Results are ordered newest-first.
 */
export async function getDispatchQueue(
  instructorUid: string,
  tenantId: string
): Promise<DispatchPacket[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "dispatches" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "instructorUid" },
                    op: "EQUAL",
                    value: { stringValue: instructorUid },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "submitted" },
                  },
                },
              ],
            },
          },
          orderBy: [
            { field: { fieldPath: "submittedAt" }, direction: "DESCENDING" },
          ],
          limit: 50,
        },
      }),
    });

    if (!response.ok) return [];
    const results = await response.json();

    return results
      .filter((r: any) => r.document)
      .map((r: any) => {
        const doc = r.document;
        const fields = parseDocFields(doc.fields || {});
        const id = doc.name.split("/").pop() ?? "";
        return fieldsToPacket(id, fields);
      });
  } catch (error) {
    console.error("[DispatchAPI] Failed to get dispatch queue:", error);
    return [];
  }
}

/**
 * Update the status of a dispatch (approve / reject / request revision).
 */
export async function updateDispatchStatus(
  dispatchId: string,
  status: DispatchStatus,
  comment?: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const safeId = sanitizeDocId(dispatchId);
    const fieldPaths = [
      "updateMask.fieldPaths=status",
      "updateMask.fieldPaths=reviewedAt",
      "updateMask.fieldPaths=reviewerComment",
    ];
    const url = `${FIRESTORE_API_URL}/dispatches/${safeId}?${fieldPaths.join("&")}`;
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        fields: {
          status: jsToFirestoreValue(status),
          reviewedAt: jsToFirestoreValue(new Date()),
          reviewerComment: jsToFirestoreValue(comment ?? null),
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("[DispatchAPI] Failed to update dispatch status:", error);
    return false;
  }
}

/**
 * Fetch dispatch history for a specific student within a tenant.
 */
export async function getStudentDispatchHistory(
  studentUid: string,
  tenantId: string
): Promise<DispatchPacket[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "dispatches" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "studentUid" },
                    op: "EQUAL",
                    value: { stringValue: studentUid },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
              ],
            },
          },
          orderBy: [
            { field: { fieldPath: "createdAt" }, direction: "DESCENDING" },
          ],
          limit: 100,
        },
      }),
    });

    if (!response.ok) return [];
    const results = await response.json();

    return results
      .filter((r: any) => r.document)
      .map((r: any) => {
        const doc = r.document;
        const fields = parseDocFields(doc.fields || {});
        const id = doc.name.split("/").pop() ?? "";
        return fieldsToPacket(id, fields);
      });
  } catch (error) {
    console.error("[DispatchAPI] Failed to get student dispatch history:", error);
    return [];
  }
}

/**
 * Fetch a single dispatch packet by its Firestore document ID.
 */
export async function getDispatchById(
  dispatchId: string
): Promise<DispatchPacket | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const safeId = sanitizeDocId(dispatchId);
    const headers = await getAuthHeaders();
    const url = `${FIRESTORE_API_URL}/dispatches/${safeId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const data = await response.json();
    const fields = parseDocFields(data.fields || {});
    return fieldsToPacket(dispatchId, fields);
  } catch (error) {
    console.error("[DispatchAPI] Failed to get dispatch:", error);
    return null;
  }
}
