import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlan, TrainingPlanData } from "@/lib/training-plans/types";
import {
  getSchoolTrainingPlans,
  saveTrainingPlan,
  updateTrainingPlan,
  deleteTrainingPlan,
  applyTrainingPlanToStudent,
} from "@/services/tenant-api";

export function useTrainingPlans(tenantId: string | null) {
  return useQuery({
    queryKey: ["training-plans", tenantId],
    queryFn: () => getSchoolTrainingPlans(tenantId!),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}

export function useSaveTrainingPlan(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: TrainingPlanData) => saveTrainingPlan(tenantId!, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans", tenantId] });
    },
  });
}

export function useUpdateTrainingPlan(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      plan,
    }: {
      planId: string;
      plan: Partial<TrainingPlanData>;
    }) => updateTrainingPlan(tenantId!, planId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans", tenantId] });
    },
  });
}

export function useDeleteTrainingPlan(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => deleteTrainingPlan(tenantId!, planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-plans", tenantId] });
    },
  });
}

export function useApplyTrainingPlan(tenantId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      plan,
      studentUid,
      studentName,
      instructorUid,
      instructorName,
      startDate,
    }: {
      plan: TrainingPlan;
      studentUid: string;
      studentName: string;
      instructorUid: string;
      instructorName: string;
      startDate: string;
    }) =>
      applyTrainingPlanToStudent(
        tenantId!,
        plan,
        studentUid,
        studentName,
        instructorUid,
        instructorName,
        startDate
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assigned-lessons"] });
    },
  });
}
