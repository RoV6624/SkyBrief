import type { FlightType } from "@/lib/briefing/types";

export const STRUGGLE_AREAS = [
  "Radio Communications",
  "Landings",
  "Airspeed Control",
  "Altitude Maintenance",
  "Navigation",
  "Weather Interpretation",
  "Checklist Discipline",
  "Situational Awareness",
  "Crosswind Technique",
  "Instrument Scanning",
  "Emergency Procedures",
  "Decision Making",
] as const;

export type StruggleArea = (typeof STRUGGLE_AREAS)[number];

export interface StudentFeedback {
  text: string;
  areasOfStruggle: StruggleArea[];
  submittedAt: string;
}

export interface InstructorFeedback {
  text: string;
  performanceNotes: string;
  submittedAt: string;
}

export interface AssignedLesson {
  id: string;
  lessonPlanId: string;
  tenantId: string;
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  scheduledDate: string; // ISO
  completedDate: string | null;
  status: "upcoming" | "completed" | "cancelled";
  studentFeedback: StudentFeedback | null;
  instructorFeedback: InstructorFeedback | null;
  // Denormalized from LessonPlan:
  lessonTitle: string;
  lessonDescription: string;
  flightType: FlightType;
  objectives: string[];
  createdAt: string;
}
