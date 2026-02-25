/**
 * Tenant API service for flight school multi-tenant operations.
 * Uses Firestore REST API (same pattern as firebase.ts).
 */

import {
  FIRESTORE_API_URL,
  firestoreValueToJS,
  jsToFirestoreValue,
  safeCurrentUser,
} from "./firebase";
import type { TenantConfig, TenantBranding } from "@/stores/tenant-store";
import type {
  BriefingSubmission,
  BriefingSubmissionStatus,
  BriefingTemplate,
  BriefingChecklist,
} from "@/lib/briefing/types";
import type { UserRole } from "@/lib/auth/roles";
import type { AssignedLesson, StudentFeedback, InstructorFeedback } from "@/lib/lessons/types";
import type { TrainingPlan, TrainingPlanData, TrainingPlanLesson } from "@/lib/training-plans/types";

// ===== Helper: Auth Headers =====

async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = safeCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");
  const idToken = await currentUser.getIdToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` };
}

// ===== Firestore Response Types =====

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

interface FirestoreQueryResult {
  document?: FirestoreDocument;
  readTime?: string;
}

// ===== Helper: Parse Firestore document fields =====

function parseDocFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = firestoreValueToJS(value);
  }
  return result;
}

// ===== Helper: Run Firestore Query =====

async function runFirestoreQuery(
  query: Record<string, unknown>
): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const url = `${FIRESTORE_API_URL}:runQuery`;
  const response = await fetch(url, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ structuredQuery: query }),
  });

  if (!response.ok) return [];
  const results: FirestoreQueryResult[] = await response.json();

  return results
    .filter((r): r is FirestoreQueryResult & { document: FirestoreDocument } => !!r.document)
    .map((r) => ({
      id: r.document.name.split("/").pop() ?? "",
      fields: parseDocFields(r.document.fields ?? {}),
    }));
}

// ===== Tenant CRUD =====

/**
 * Create a new flight school (tenant) directly in Firestore.
 * Returns the tenant ID on success, null on failure.
 */
export async function createTenantDirect(opts: {
  schoolName: string;
  inviteCode: string;
  adminEmail?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return null;

    const idToken = await currentUser.getIdToken();
    const code = opts.inviteCode.toUpperCase();

    // Check for duplicate invite code first
    const checkUrl = `${FIRESTORE_API_URL}:runQuery`;
    const checkResp = await fetch(checkUrl, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "tenants" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "inviteCode" },
              op: "EQUAL",
              value: { stringValue: code },
            },
          },
          limit: 1,
        },
      }),
    });

    if (checkResp.ok) {
      const results = await checkResp.json();
      if (results.find((r: any) => r.document)) {
        console.warn("[TenantAPI] Invite code already in use:", code);
        return null;
      }
    }

    // Create the tenant document
    const url = `${FIRESTORE_API_URL}/tenants`;
    const fields: Record<string, any> = {
      schoolName: jsToFirestoreValue(opts.schoolName.trim()),
      inviteCode: jsToFirestoreValue(code),
      adminEmail: jsToFirestoreValue(opts.adminEmail ?? null),
      primaryColor: jsToFirestoreValue(opts.primaryColor ?? "#0c8ce9"),
      secondaryColor: jsToFirestoreValue(opts.secondaryColor ?? "#083f6e"),
      accentColor: jsToFirestoreValue(opts.accentColor ?? "#D4A853"),
      briefingTemplates: jsToFirestoreValue(true),
      cfiReview: jsToFirestoreValue(true),
      studentProgress: jsToFirestoreValue(true),
      schoolAnalytics: jsToFirestoreValue(true),
      lessonPlans: jsToFirestoreValue(true),
      dispatch: jsToFirestoreValue(true),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      console.error("[TenantAPI] Failed to create tenant:", response.status);
      return null;
    }

    const data = await response.json();
    const tenantId = data.name?.split("/").pop() ?? null;
    console.log(`[TenantAPI] Created tenant "${opts.schoolName}" with ID ${tenantId} and code ${code}`);
    return tenantId;
  } catch (error) {
    console.error("[TenantAPI] Failed to create tenant:", error);
    return null;
  }
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const currentUser = safeCurrentUser();
    const headers: Record<string, string> = {};
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }

    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const data = await response.json();
    const fields = parseDocFields(data.fields || {});

    return {
      id: tenantId,
      branding: {
        schoolName: fields.schoolName ?? "Flight School",
        logoUrl: fields.logoUrl ?? undefined,
        primaryColor: fields.primaryColor ?? "#0c8ce9",
        secondaryColor: fields.secondaryColor ?? "#083f6e",
        accentColor: fields.accentColor ?? "#D4A853",
      },
      features: {
        briefingTemplates: fields.briefingTemplates ?? true,
        cfiReview: fields.cfiReview ?? true,
        studentProgress: fields.studentProgress ?? true,
        schoolAnalytics: fields.schoolAnalytics ?? true,
        lessonPlans: fields.lessonPlans ?? false,
        dispatch: fields.dispatch ?? false,
      },
      defaultTemplateIds: [],
      adminEmail: fields.adminEmail ?? undefined,
    };
  } catch (error) {
    console.error("[TenantAPI] Failed to get tenant config:", error);
    return null;
  }
}

export async function getUserTenant(uid: string): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const headers = await getAuthHeaders();
    const url = `${FIRESTORE_API_URL}/users/${uid}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const data = await response.json();
    const fields = data.fields || {};
    return firestoreValueToJS(fields.tenantId) ?? null;
  } catch (error) {
    console.error("[TenantAPI] Failed to get user tenant:", error);
    return null;
  }
}

export async function getUserRole(uid: string): Promise<UserRole> {
  if (!FIRESTORE_API_URL) return "pilot";

  try {
    const headers = await getAuthHeaders();
    const url = `${FIRESTORE_API_URL}/users/${uid}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return "pilot";

    const data = await response.json();
    const fields = data.fields || {};
    return (firestoreValueToJS(fields.role) as UserRole) ?? "pilot";
  } catch (error) {
    console.error("[TenantAPI] Failed to get user role:", error);
    return "pilot";
  }
}

// ===== Briefing Submissions =====

export async function submitBriefingForReview(params: {
  briefing: BriefingChecklist;
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  tenantId: string;
  templateId?: string;
  fratScore?: number;
  minimumsPass?: boolean;
}): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/briefings`;
    const fields: Record<string, any> = {
      briefingId: jsToFirestoreValue(params.briefing.id),
      studentUid: jsToFirestoreValue(params.studentUid),
      studentName: jsToFirestoreValue(params.studentName),
      instructorUid: jsToFirestoreValue(params.instructorUid),
      instructorName: jsToFirestoreValue(params.instructorName),
      tenantId: jsToFirestoreValue(params.tenantId),
      status: jsToFirestoreValue("submitted"),
      submittedAt: jsToFirestoreValue(new Date()),
      fratScore: jsToFirestoreValue(params.fratScore ?? null),
      minimumsPass: jsToFirestoreValue(params.minimumsPass ?? null),
      flightType: jsToFirestoreValue(params.briefing.flightType),
      station: jsToFirestoreValue(params.briefing.station),
      checklistItemCount: jsToFirestoreValue(params.briefing.items.length),
      checkedItemCount: jsToFirestoreValue(
        params.briefing.items.filter((i) => i.status === "checked").length
      ),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    // Extract document ID from name
    const name = data.name || "";
    const id = name.split("/").pop() || null;
    return id;
  } catch (error) {
    console.error("[TenantAPI] Failed to submit briefing:", error);
    return null;
  }
}

export async function getInstructorReviewQueue(
  instructorUid: string,
  tenantId: string
): Promise<BriefingSubmission[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    // Use Firestore REST runQuery with auth
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const currentUser = safeCurrentUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      headers.Authorization = `Bearer ${idToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "briefings" }],
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
              ],
            },
          },
          orderBy: [{ field: { fieldPath: "submittedAt" }, direction: "DESCENDING" }],
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
        const id = doc.name.split("/").pop();
        return {
          id,
          briefingId: fields.briefingId ?? "",
          studentUid: fields.studentUid ?? "",
          studentName: fields.studentName ?? "Unknown",
          instructorUid: fields.instructorUid ?? "",
          instructorName: fields.instructorName ?? "",
          tenantId: fields.tenantId ?? "",
          status: fields.status ?? "submitted",
          checklist: {
            id: fields.briefingId ?? "",
            station: fields.station ?? "",
            stationName: "",
            createdAt: fields.submittedAt ?? new Date(),
            items: [],
            flightType: fields.flightType ?? "local",
            pilotName: fields.studentName ?? "",
            aircraftType: "",
            isComplete: true,
          },
          submittedAt: fields.submittedAt ?? new Date(),
          reviewedAt: fields.reviewedAt ?? undefined,
          reviewerComment: fields.reviewerComment ?? undefined,
          fratScore: fields.fratScore ?? undefined,
          minimumsPass: fields.minimumsPass ?? undefined,
        } as BriefingSubmission;
      });
  } catch (error) {
    console.warn("[TenantAPI] Failed to get review queue:", error);
    return [];
  }
}

export async function updateBriefingStatus(
  briefingId: string,
  status: BriefingSubmissionStatus,
  reviewerComment?: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const url = `${FIRESTORE_API_URL}/briefings/${briefingId}?updateMask.fieldPaths=status&updateMask.fieldPaths=reviewedAt&updateMask.fieldPaths=reviewerComment`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        fields: {
          status: jsToFirestoreValue(status),
          reviewedAt: jsToFirestoreValue(new Date()),
          reviewerComment: jsToFirestoreValue(reviewerComment ?? null),
        },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to update briefing status:", error);
    return false;
  }
}

// ===== Student Metrics =====

export interface StudentMetrics {
  studentUid: string;
  studentName: string;
  totalBriefings: number;
  approvedFirstTry: number;
  avgFratScore: number;
  minimumsBreaches: number;
  lastBriefingDate: Date | null;
  briefingsByType: Record<string, number>;
}

export async function getStudentMetrics(
  studentUid: string,
  tenantId: string
): Promise<StudentMetrics | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "briefings" }],
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
          orderBy: [{ field: { fieldPath: "submittedAt" }, direction: "DESCENDING" }],
          limit: 100,
        },
      }),
    });

    if (!response.ok) return null;
    const results = await response.json();
    const submissions = results
      .filter((r: any) => r.document)
      .map((r: any) => parseDocFields(r.document.fields || {}));

    if (submissions.length === 0) return null;

    const totalBriefings = submissions.length;
    const approved = submissions.filter((s: any) => s.status === "approved");
    const approvedFirstTry = approved.length;
    const fratScores = submissions
      .filter((s: any) => s.fratScore != null)
      .map((s: any) => s.fratScore as number);
    const avgFratScore =
      fratScores.length > 0
        ? Math.round((fratScores.reduce((a: number, b: number) => a + b, 0) / fratScores.length) * 10) / 10
        : 0;
    const minimumsBreaches = submissions.filter(
      (s: any) => s.minimumsPass === false
    ).length;

    const briefingsByType: Record<string, number> = {};
    for (const sub of submissions) {
      const type = (sub.flightType as string) || "local";
      briefingsByType[type] = (briefingsByType[type] || 0) + 1;
    }

    return {
      studentUid,
      studentName: (submissions[0]?.studentName as string) ?? "Unknown",
      totalBriefings,
      approvedFirstTry,
      avgFratScore,
      minimumsBreaches,
      lastBriefingDate: submissions[0]?.submittedAt
        ? new Date(submissions[0].submittedAt as any)
        : null,
      briefingsByType,
    };
  } catch (error) {
    console.error("[TenantAPI] Failed to get student metrics:", error);
    return null;
  }
}

export async function getSchoolStudents(
  tenantId: string
): Promise<Array<{ uid: string; name: string; role: UserRole }>> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "role" },
                    op: "EQUAL",
                    value: { stringValue: "student" },
                  },
                },
              ],
            },
          },
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
        const uid = doc.name.split("/").pop();
        return {
          uid,
          name: (fields.name as string) ?? "Unknown",
          role: (fields.role as UserRole) ?? "student",
        };
      });
  } catch (error) {
    console.error("[TenantAPI] Failed to get school students:", error);
    return [];
  }
}

// ===== Templates =====

export async function getSchoolTemplates(
  tenantId: string
): Promise<BriefingTemplate[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/templates`;
    const response = await fetch(url, { headers: await getAuthHeaders() });
    if (!response.ok) return [];

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc: any) => {
      const fields = parseDocFields(doc.fields || {});
      const id = doc.name.split("/").pop();
      return {
        id,
        tenantId,
        name: fields.name ?? "",
        flightType: fields.flightType ?? "local",
        description: fields.description ?? "",
        requiredItems: [],
        maxFratScore: fields.maxFratScore ?? undefined,
        requireMinimumsPass: fields.requireMinimumsPass ?? true,
        createdBy: fields.createdBy ?? "",
        createdAt: fields.createdAt ?? new Date(),
        updatedAt: fields.updatedAt ?? new Date(),
      } as BriefingTemplate;
    });
  } catch (error) {
    console.error("[TenantAPI] Failed to get templates:", error);
    return [];
  }
}

// ===== Briefing Notes =====

export interface BriefingNoteData {
  id: string;
  briefingId: string;
  authorUid: string;
  authorName: string;
  authorRole: "student" | "instructor";
  text: string;
  createdAt: string;
}

export async function getBriefingNotes(
  briefingId: string
): Promise<BriefingNoteData[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}/briefings/${briefingId}/notes`;
    const response = await fetch(url, { headers: await getAuthHeaders() });
    if (!response.ok) return [];

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc: any) => {
      const fields = parseDocFields(doc.fields || {});
      const id = doc.name.split("/").pop();
      return {
        id,
        briefingId,
        authorUid: fields.authorUid ?? "",
        authorName: fields.authorName ?? "Unknown",
        authorRole: fields.authorRole ?? "student",
        text: fields.text ?? "",
        createdAt: fields.createdAt ?? new Date().toISOString(),
      } as BriefingNoteData;
    });
  } catch (error) {
    console.error("[TenantAPI] Failed to get notes:", error);
    return [];
  }
}

export async function addBriefingNote(
  briefingId: string,
  note: {
    authorUid: string;
    authorName: string;
    authorRole: "student" | "instructor";
    text: string;
  }
): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/briefings/${briefingId}/notes`;
    const fields: Record<string, any> = {
      authorUid: jsToFirestoreValue(note.authorUid),
      authorName: jsToFirestoreValue(note.authorName),
      authorRole: jsToFirestoreValue(note.authorRole),
      text: jsToFirestoreValue(note.text),
      createdAt: jsToFirestoreValue(new Date().toISOString()),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.name?.split("/").pop() ?? null;
  } catch (error) {
    console.error("[TenantAPI] Failed to add note:", error);
    return null;
  }
}

export async function deleteBriefingNote(
  briefingId: string,
  noteId: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const url = `${FIRESTORE_API_URL}/briefings/${briefingId}/notes/${noteId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: await getAuthHeaders(),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to delete note:", error);
    return false;
  }
}

// ===== Lesson Plans =====

export interface LessonPlanData {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  flightType: string;
  requiredChecklistItems: string[];
  maxFratScore: number;
  objectives: string[];
  createdBy: string;
  createdAt: string;
}

export async function getSchoolLessonPlans(
  tenantId: string
): Promise<LessonPlanData[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/lessons`;
    const response = await fetch(url, { headers: await getAuthHeaders() });
    if (!response.ok) return [];

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc: any) => {
      const fields = parseDocFields(doc.fields || {});
      const id = doc.name.split("/").pop();
      return {
        id,
        tenantId,
        title: fields.title ?? "",
        description: fields.description ?? "",
        flightType: fields.flightType ?? "local",
        requiredChecklistItems: fields.requiredChecklistItems ?? [],
        maxFratScore: fields.maxFratScore ?? 25,
        objectives: fields.objectives ?? [],
        createdBy: fields.createdBy ?? "",
        createdAt: fields.createdAt ?? new Date().toISOString(),
      } as LessonPlanData;
    });
  } catch (error) {
    console.error("[TenantAPI] Failed to get lesson plans:", error);
    return [];
  }
}

export async function saveLessonPlan(
  tenantId: string,
  plan: Omit<LessonPlanData, "id">
): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/lessons`;
    const fields: Record<string, any> = {
      title: jsToFirestoreValue(plan.title),
      description: jsToFirestoreValue(plan.description),
      flightType: jsToFirestoreValue(plan.flightType),
      requiredChecklistItems: jsToFirestoreValue(plan.requiredChecklistItems),
      maxFratScore: jsToFirestoreValue(plan.maxFratScore),
      objectives: jsToFirestoreValue(plan.objectives),
      createdBy: jsToFirestoreValue(plan.createdBy),
      createdAt: jsToFirestoreValue(plan.createdAt || new Date().toISOString()),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.name?.split("/").pop() ?? null;
  } catch (error) {
    console.error("[TenantAPI] Failed to save lesson plan:", error);
    return null;
  }
}

export async function deleteLessonPlan(
  tenantId: string,
  lessonId: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return false;

    const idToken = await currentUser.getIdToken();
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/lessons/${lessonId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to delete lesson plan:", error);
    return false;
  }
}

// ===== Invite Code Flow =====

export async function findTenantByInviteCode(
  code: string
): Promise<{ id: string; schoolName: string } | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return null;

    const idToken = await currentUser.getIdToken();
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "tenants" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "inviteCode" },
              op: "EQUAL",
              value: { stringValue: code.toUpperCase() },
            },
          },
          limit: 1,
        },
      }),
    });

    if (!response.ok) return null;
    const results = await response.json();

    const doc = results.find((r: any) => r.document)?.document;
    if (!doc) return null;

    const fields = parseDocFields(doc.fields || {});
    const id = doc.name.split("/").pop();
    return {
      id: id ?? "",
      schoolName: (fields.schoolName as string) ?? "Flight School",
    };
  } catch (error) {
    console.error("[TenantAPI] Failed to find tenant by invite code:", error);
    return null;
  }
}

export async function joinTenant(
  uid: string,
  tenantId: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return false;

    const idToken = await currentUser.getIdToken();
    const url = `${FIRESTORE_API_URL}/users/${uid}?updateMask.fieldPaths=tenantId`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          tenantId: jsToFirestoreValue(tenantId),
        },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to join tenant:", error);
    return false;
  }
}

// ===== School Instructors =====

export async function getSchoolInstructors(
  tenantId: string
): Promise<Array<{ uid: string; name: string; role: string }>> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "role" },
                    op: "IN",
                    value: {
                      arrayValue: {
                        values: [
                          { stringValue: "instructor" },
                          { stringValue: "school_admin" },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
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
        const uid = doc.name.split("/").pop();
        return {
          uid,
          name: (fields.name as string) ?? "Unknown",
          role: (fields.role as string) ?? "instructor",
        };
      });
  } catch (error) {
    console.error("[TenantAPI] Failed to get school instructors:", error);
    return [];
  }
}

export async function assignInstructor(
  studentUid: string,
  instructorUid: string,
  instructorName: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return false;

    const idToken = await currentUser.getIdToken();
    const url = `${FIRESTORE_API_URL}/users/${studentUid}?updateMask.fieldPaths=assignedInstructorUid&updateMask.fieldPaths=assignedInstructorName`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          assignedInstructorUid: jsToFirestoreValue(instructorUid),
          assignedInstructorName: jsToFirestoreValue(instructorName),
        },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to assign instructor:", error);
    return false;
  }
}

// ===== Assigned Lessons =====

export async function getStudentAssignedLessons(
  tenantId: string,
  studentUid: string
): Promise<AssignedLesson[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "assigned_lessons", allDescendants: true }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "studentUid" },
                    op: "EQUAL",
                    value: { stringValue: studentUid },
                  },
                },
              ],
            },
          },
          orderBy: [{ field: { fieldPath: "scheduledDate" }, direction: "DESCENDING" }],
          limit: 100,
        },
      }),
    });

    if (!response.ok) return [];
    const results = await response.json();

    return results
      .filter((r: any) => r.document)
      .map((r: any) => parseAssignedLesson(r.document));
  } catch (error) {
    console.error("[TenantAPI] Failed to get student lessons:", error);
    return [];
  }
}

export async function getInstructorAssignedLessons(
  tenantId: string,
  instructorUid: string
): Promise<AssignedLesson[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "assigned_lessons", allDescendants: true }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "instructorUid" },
                    op: "EQUAL",
                    value: { stringValue: instructorUid },
                  },
                },
              ],
            },
          },
          orderBy: [{ field: { fieldPath: "scheduledDate" }, direction: "DESCENDING" }],
          limit: 100,
        },
      }),
    });

    if (!response.ok) return [];
    const results = await response.json();

    return results
      .filter((r: any) => r.document)
      .map((r: any) => parseAssignedLesson(r.document));
  } catch (error) {
    console.error("[TenantAPI] Failed to get instructor lessons:", error);
    return [];
  }
}

export async function assignLesson(
  tenantId: string,
  lesson: Omit<AssignedLesson, "id">
): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/assigned_lessons`;
    const fields: Record<string, any> = {
      lessonPlanId: jsToFirestoreValue(lesson.lessonPlanId),
      tenantId: jsToFirestoreValue(lesson.tenantId),
      studentUid: jsToFirestoreValue(lesson.studentUid),
      studentName: jsToFirestoreValue(lesson.studentName),
      instructorUid: jsToFirestoreValue(lesson.instructorUid),
      instructorName: jsToFirestoreValue(lesson.instructorName),
      scheduledDate: jsToFirestoreValue(lesson.scheduledDate),
      completedDate: jsToFirestoreValue(lesson.completedDate),
      status: jsToFirestoreValue(lesson.status),
      studentFeedback: jsToFirestoreValue(null),
      instructorFeedback: jsToFirestoreValue(null),
      lessonTitle: jsToFirestoreValue(lesson.lessonTitle),
      lessonDescription: jsToFirestoreValue(lesson.lessonDescription),
      flightType: jsToFirestoreValue(lesson.flightType),
      objectives: jsToFirestoreValue(lesson.objectives),
      createdAt: jsToFirestoreValue(lesson.createdAt || new Date().toISOString()),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.name?.split("/").pop() ?? null;
  } catch (error) {
    console.error("[TenantAPI] Failed to assign lesson:", error);
    return null;
  }
}

export async function updateAssignedLessonStatus(
  tenantId: string,
  lessonId: string,
  status: AssignedLesson["status"],
  completedDate?: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    let url = `${FIRESTORE_API_URL}/tenants/${tenantId}/assigned_lessons/${lessonId}?updateMask.fieldPaths=status`;
    if (completedDate) {
      url += "&updateMask.fieldPaths=completedDate";
    }

    const fields: Record<string, any> = {
      status: jsToFirestoreValue(status),
    };
    if (completedDate) {
      fields.completedDate = jsToFirestoreValue(completedDate);
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to update lesson status:", error);
    return false;
  }
}

export async function submitLessonFeedback(
  tenantId: string,
  lessonId: string,
  feedback: StudentFeedback | InstructorFeedback,
  feedbackType: "studentFeedback" | "instructorFeedback"
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/assigned_lessons/${lessonId}?updateMask.fieldPaths=${feedbackType}`;

    // Serialize feedback as a map value
    const feedbackMap: Record<string, any> = {
      text: jsToFirestoreValue(feedback.text),
      submittedAt: jsToFirestoreValue(feedback.submittedAt),
    };

    if (feedbackType === "studentFeedback") {
      const sf = feedback as StudentFeedback;
      feedbackMap.areasOfStruggle = jsToFirestoreValue(sf.areasOfStruggle);
    } else {
      const inf = feedback as InstructorFeedback;
      feedbackMap.performanceNotes = jsToFirestoreValue(inf.performanceNotes);
    }

    const response = await fetch(url, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        fields: {
          [feedbackType]: { mapValue: { fields: feedbackMap } },
        },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to submit lesson feedback:", error);
    return false;
  }
}

// ===== Instructor Students =====

export async function getInstructorStudents(
  instructorUid: string,
  tenantId: string
): Promise<Array<{ uid: string; name: string; role: UserRole; email?: string; assignedInstructorUid?: string }>> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "tenantId" },
                    op: "EQUAL",
                    value: { stringValue: tenantId },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "role" },
                    op: "EQUAL",
                    value: { stringValue: "student" },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "assignedInstructorUid" },
                    op: "EQUAL",
                    value: { stringValue: instructorUid },
                  },
                },
              ],
            },
          },
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
        const uid = doc.name.split("/").pop();
        return {
          uid,
          name: (fields.name as string) ?? "Unknown",
          role: (fields.role as UserRole) ?? "student",
          email: (fields.email as string) ?? undefined,
          assignedInstructorUid: (fields.assignedInstructorUid as string) ?? undefined,
        };
      });
  } catch (error) {
    console.error("[TenantAPI] Failed to get instructor students:", error);
    return [];
  }
}

export async function getStudentCurriculumProgress(
  studentUid: string,
  tenantId: string
): Promise<{ completedLessonIds: string[]; totalAssigned: number }> {
  if (!FIRESTORE_API_URL) return { completedLessonIds: [], totalAssigned: 0 };

  try {
    const lessons = await getStudentAssignedLessons(tenantId, studentUid);
    const completedLessonIds = lessons
      .filter((l) => l.status === "completed")
      .map((l) => l.lessonPlanId);
    return { completedLessonIds, totalAssigned: lessons.length };
  } catch (error) {
    console.error("[TenantAPI] Failed to get curriculum progress:", error);
    return { completedLessonIds: [], totalAssigned: 0 };
  }
}

// ===== Assigned Lesson Parser =====

function parseAssignedLesson(doc: any): AssignedLesson {
  const fields = parseDocFields(doc.fields || {});
  const id = doc.name.split("/").pop();

  // Parse nested feedback maps
  const rawStudentFb = doc.fields?.studentFeedback?.mapValue?.fields;
  const rawInstructorFb = doc.fields?.instructorFeedback?.mapValue?.fields;

  const studentFeedback: AssignedLesson["studentFeedback"] = rawStudentFb
    ? {
        text: firestoreValueToJS(rawStudentFb.text) ?? "",
        areasOfStruggle: firestoreValueToJS(rawStudentFb.areasOfStruggle) ?? [],
        submittedAt: firestoreValueToJS(rawStudentFb.submittedAt) ?? "",
      }
    : null;

  const instructorFeedback: AssignedLesson["instructorFeedback"] = rawInstructorFb
    ? {
        text: firestoreValueToJS(rawInstructorFb.text) ?? "",
        performanceNotes: firestoreValueToJS(rawInstructorFb.performanceNotes) ?? "",
        submittedAt: firestoreValueToJS(rawInstructorFb.submittedAt) ?? "",
      }
    : null;

  return {
    id: id ?? "",
    lessonPlanId: (fields.lessonPlanId as string) ?? "",
    tenantId: (fields.tenantId as string) ?? "",
    studentUid: (fields.studentUid as string) ?? "",
    studentName: (fields.studentName as string) ?? "",
    instructorUid: (fields.instructorUid as string) ?? "",
    instructorName: (fields.instructorName as string) ?? "",
    scheduledDate: (fields.scheduledDate as string) ?? "",
    completedDate: (fields.completedDate as string) ?? null,
    status: (fields.status as AssignedLesson["status"]) ?? "upcoming",
    studentFeedback,
    instructorFeedback,
    lessonTitle: (fields.lessonTitle as string) ?? "",
    lessonDescription: (fields.lessonDescription as string) ?? "",
    flightType: (fields.flightType as any) ?? "local",
    objectives: (fields.objectives as string[]) ?? [],
    createdAt: (fields.createdAt as string) ?? "",
  };
}

// ===== Training Plans =====

export async function getSchoolTrainingPlans(
  tenantId: string
): Promise<TrainingPlan[]> {
  if (!FIRESTORE_API_URL) return [];

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/training_plans`;
    const response = await fetch(url, { headers: await getAuthHeaders() });
    if (!response.ok) return [];

    const data = await response.json();
    const documents = data.documents || [];

    return documents.map((doc: any) => {
      const fields = parseDocFields(doc.fields || {});
      const id = doc.name.split("/").pop();
      return {
        id,
        tenantId,
        title: fields.title ?? "",
        description: fields.description ?? "",
        lessons: fields.lessons ?? [],
        createdBy: fields.createdBy ?? "",
        createdByName: fields.createdByName ?? "",
        createdAt: fields.createdAt ?? new Date().toISOString(),
        updatedAt: fields.updatedAt ?? new Date().toISOString(),
      } as TrainingPlan;
    });
  } catch (error) {
    console.error("[TenantAPI] Failed to get training plans:", error);
    return [];
  }
}

export async function saveTrainingPlan(
  tenantId: string,
  plan: TrainingPlanData
): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/training_plans`;
    const fields: Record<string, any> = {
      tenantId: jsToFirestoreValue(plan.tenantId),
      title: jsToFirestoreValue(plan.title),
      description: jsToFirestoreValue(plan.description),
      lessons: jsToFirestoreValue(plan.lessons),
      createdBy: jsToFirestoreValue(plan.createdBy),
      createdByName: jsToFirestoreValue(plan.createdByName),
      createdAt: jsToFirestoreValue(plan.createdAt || new Date().toISOString()),
      updatedAt: jsToFirestoreValue(plan.updatedAt || new Date().toISOString()),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.name?.split("/").pop() ?? null;
  } catch (error) {
    console.error("[TenantAPI] Failed to save training plan:", error);
    return null;
  }
}

export async function updateTrainingPlan(
  tenantId: string,
  planId: string,
  plan: Partial<TrainingPlanData>
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const fieldPaths = ["title", "description", "lessons", "updatedAt"];
    const mask = fieldPaths.map((f) => `updateMask.fieldPaths=${f}`).join("&");
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/training_plans/${planId}?${mask}`;

    const fields: Record<string, any> = {
      title: jsToFirestoreValue(plan.title ?? ""),
      description: jsToFirestoreValue(plan.description ?? ""),
      lessons: jsToFirestoreValue(plan.lessons ?? []),
      updatedAt: jsToFirestoreValue(new Date().toISOString()),
    };

    const response = await fetch(url, {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({ fields }),
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to update training plan:", error);
    return false;
  }
}

export async function deleteTrainingPlan(
  tenantId: string,
  planId: string
): Promise<boolean> {
  if (!FIRESTORE_API_URL) return false;

  try {
    const currentUser = safeCurrentUser();
    if (!currentUser) return false;

    const idToken = await currentUser.getIdToken();
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}/training_plans/${planId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return response.ok;
  } catch (error) {
    console.error("[TenantAPI] Failed to delete training plan:", error);
    return false;
  }
}

export async function applyTrainingPlanToStudent(
  tenantId: string,
  plan: TrainingPlan,
  studentUid: string,
  studentName: string,
  instructorUid: string,
  instructorName: string,
  startDate: string
): Promise<{ assigned: number; failed: number }> {
  let assigned = 0;
  let failed = 0;

  const sortedLessons = [...plan.lessons].sort((a, b) => a.order - b.order);
  const base = new Date(startDate);

  for (let i = 0; i < sortedLessons.length; i++) {
    const lesson = sortedLessons[i];
    const scheduledDate = new Date(base);
    scheduledDate.setDate(scheduledDate.getDate() + i);

    const id = await assignLesson(tenantId, {
      lessonPlanId: lesson.sourceId ?? lesson.id,
      tenantId,
      studentUid,
      studentName,
      instructorUid,
      instructorName,
      scheduledDate: scheduledDate.toISOString(),
      completedDate: null,
      status: "upcoming",
      studentFeedback: null,
      instructorFeedback: null,
      lessonTitle: lesson.title,
      lessonDescription: lesson.description,
      flightType: lesson.flightType,
      objectives: lesson.objectives,
      createdAt: new Date().toISOString(),
    });

    if (id) {
      assigned++;
    } else {
      failed++;
    }
  }

  return { assigned, failed };
}
