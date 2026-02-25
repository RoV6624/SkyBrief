import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStudentAssignedLessons,
  getInstructorAssignedLessons,
  submitLessonFeedback,
} from "@/services/tenant-api";
import type { StudentFeedback, InstructorFeedback } from "@/lib/lessons/types";

export function useStudentLessons(studentUid: string | undefined, tenantId: string | null) {
  return useQuery({
    queryKey: ["student-lessons", tenantId, studentUid],
    queryFn: () => getStudentAssignedLessons(tenantId!, studentUid!),
    enabled: !!tenantId && !!studentUid,
    staleTime: 60_000,
  });
}

export function useInstructorLessons(instructorUid: string | undefined, tenantId: string | null) {
  return useQuery({
    queryKey: ["instructor-lessons", tenantId, instructorUid],
    queryFn: () => getInstructorAssignedLessons(tenantId!, instructorUid!),
    enabled: !!tenantId && !!instructorUid,
    staleTime: 60_000,
  });
}

export function useLessonFeedback(tenantId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      feedback,
      feedbackType,
    }: {
      lessonId: string;
      feedback: StudentFeedback | InstructorFeedback;
      feedbackType: "studentFeedback" | "instructorFeedback";
    }) => submitLessonFeedback(tenantId!, lessonId, feedback, feedbackType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-lessons"] });
      queryClient.invalidateQueries({ queryKey: ["instructor-lessons"] });
    },
  });
}
