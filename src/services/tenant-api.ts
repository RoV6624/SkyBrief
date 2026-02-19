/**
 * Tenant API service for flight school multi-tenant operations.
 * Uses Firestore REST API (same pattern as firebase.ts).
 */

import {
  FIRESTORE_API_URL,
  firestoreValueToJS,
  jsToFirestoreValue,
} from "./firebase";
import type { TenantConfig, TenantBranding } from "@/stores/tenant-store";
import type {
  BriefingSubmission,
  BriefingSubmissionStatus,
  BriefingTemplate,
  BriefingChecklist,
} from "@/lib/briefing/types";
import type { UserRole } from "@/lib/auth/roles";

// ===== Helper: Parse Firestore document fields =====

function parseDocFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = firestoreValueToJS(value);
  }
  return result;
}

// ===== Tenant CRUD =====

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/tenants/${tenantId}`;
    const response = await fetch(url);
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
      },
      defaultTemplateIds: [],
    };
  } catch (error) {
    console.error("[TenantAPI] Failed to get tenant config:", error);
    return null;
  }
}

export async function getUserTenant(uid: string): Promise<string | null> {
  if (!FIRESTORE_API_URL) return null;

  try {
    const url = `${FIRESTORE_API_URL}/users/${uid}`;
    const response = await fetch(url);
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
    const url = `${FIRESTORE_API_URL}/users/${uid}`;
    const response = await fetch(url);
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
      headers: { "Content-Type": "application/json" },
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
    // Use Firestore REST runQuery
    const url = `${FIRESTORE_API_URL}:runQuery`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    console.error("[TenantAPI] Failed to get review queue:", error);
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(url);
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
    const response = await fetch(url);
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
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(url, { method: "DELETE" });
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
    const response = await fetch(url);
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
      maxFratScore: jsToFirestoreValue(plan.maxFratScore),
      createdBy: jsToFirestoreValue(plan.createdBy),
      createdAt: jsToFirestoreValue(plan.createdAt || new Date().toISOString()),
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
