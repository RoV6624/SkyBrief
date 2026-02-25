import type { FlightType } from "@/lib/briefing/types";

export interface CurriculumLesson {
  id: string;
  title: string;
  description: string;
  flightType: FlightType;
  objectives: string[];
  dualHours: number;
  soloHours: number;
  groundHours: number;
  references: string[];
  completionStandards: string[];
}

export interface CurriculumStage {
  id: string;
  stageNumber: number;
  title: string;
  description: string;
  lessons: CurriculumLesson[];
  requiredHours: number;
  objectives: string[];
}

export interface Curriculum {
  id: string;
  title: string;
  description: string;
  stages: CurriculumStage[];
  totalMinHours: number;
  certificateType: "private" | "instrument" | "commercial";
}
