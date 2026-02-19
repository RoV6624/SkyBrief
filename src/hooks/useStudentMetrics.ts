import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getStudentMetrics,
  getSchoolStudents,
  getInstructorReviewQueue,
  type StudentMetrics,
} from "@/services/tenant-api";
import type { BriefingSubmission } from "@/lib/briefing/types";
import { calculateReadiness, type ReadinessResult } from "@/lib/progress/readiness";

/**
 * Fetch metrics for a specific student
 */
export function useStudentMetrics(studentUid: string | null, tenantId: string | null) {
  return useQuery({
    queryKey: ["student-metrics", studentUid, tenantId],
    queryFn: async (): Promise<StudentMetrics | null> => {
      if (!studentUid || !tenantId) return null;
      return getStudentMetrics(studentUid, tenantId);
    },
    enabled: !!studentUid && !!tenantId,
    staleTime: 300_000,
  });
}

/**
 * Fetch all students in a school
 */
export function useSchoolStudents(tenantId: string | null) {
  return useQuery({
    queryKey: ["school-students", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return getSchoolStudents(tenantId);
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });
}

/**
 * Calculate stage check readiness from student metrics
 */
export function useStudentReadiness(metrics: StudentMetrics | null | undefined): ReadinessResult | null {
  return useMemo(() => {
    if (!metrics) return null;
    return calculateReadiness(metrics);
  }, [metrics]);
}

/**
 * Fetch CFI review queue
 */
export function useReviewQueue(instructorUid: string | null, tenantId: string | null) {
  return useQuery({
    queryKey: ["review-queue", instructorUid, tenantId],
    queryFn: async (): Promise<BriefingSubmission[]> => {
      if (!instructorUid || !tenantId) return [];
      return getInstructorReviewQueue(instructorUid, tenantId);
    },
    enabled: !!instructorUid && !!tenantId,
    refetchInterval: 60_000, // Check for new submissions every minute
    staleTime: 30_000,
  });
}
