import type { FlightType } from "@/lib/briefing/types";

export type TrainingPlanLessonSource = "curriculum" | "custom" | "inline";

export interface TrainingPlanLesson {
  id: string;
  source: TrainingPlanLessonSource;
  sourceId: string | null;
  order: number;
  title: string;
  description: string;
  flightType: FlightType;
  objectives: string[];
}

export interface TrainingPlan {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  lessons: TrainingPlanLesson[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type TrainingPlanData = Omit<TrainingPlan, "id">;
