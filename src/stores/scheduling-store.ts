/**
 * CFI Assignment & Scheduling Store
 *
 * Manages student-CFI assignments and lesson scheduling.
 * Persisted locally; synced with Firestore when online.
 */

import { createPersistedStore } from "./middleware";

export interface LessonSlot {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  lessonPlanId?: string;
  lessonTitle?: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  briefingCompleted: boolean;
  notes?: string;
}

export interface CFIAssignment {
  studentUid: string;
  studentName: string;
  instructorUid: string;
  instructorName: string;
  assignedAt: string; // ISO
}

interface SchedulingStore {
  assignments: CFIAssignment[];
  lessons: LessonSlot[];

  // Assignments
  addAssignment: (assignment: Omit<CFIAssignment, "assignedAt">) => void;
  removeAssignment: (studentUid: string) => void;
  getAssignedInstructor: (studentUid: string) => CFIAssignment | null;
  getAssignedStudents: (instructorUid: string) => CFIAssignment[];

  // Lessons
  addLesson: (lesson: Omit<LessonSlot, "id" | "status" | "briefingCompleted">) => void;
  updateLesson: (id: string, updates: Partial<LessonSlot>) => void;
  cancelLesson: (id: string) => void;
  getUpcomingLessons: (uid: string) => LessonSlot[];
  getTodayLessons: (uid: string) => LessonSlot[];
  markBriefingCompleted: (lessonId: string) => void;
}

export const useSchedulingStore = createPersistedStore<SchedulingStore>(
  "scheduling",
  (set, get) => ({
    assignments: [],
    lessons: [],

    addAssignment: (assignment) => {
      const existing = get().assignments.filter(
        (a) => a.studentUid !== assignment.studentUid
      );
      set({
        assignments: [
          ...existing,
          { ...assignment, assignedAt: new Date().toISOString() },
        ],
      });
    },

    removeAssignment: (studentUid) => {
      set({
        assignments: get().assignments.filter((a) => a.studentUid !== studentUid),
      });
    },

    getAssignedInstructor: (studentUid) => {
      return get().assignments.find((a) => a.studentUid === studentUid) ?? null;
    },

    getAssignedStudents: (instructorUid) => {
      return get().assignments.filter((a) => a.instructorUid === instructorUid);
    },

    addLesson: (lesson) => {
      const id = `LSN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      set({
        lessons: [
          ...get().lessons,
          { ...lesson, id, status: "scheduled", briefingCompleted: false },
        ],
      });
    },

    updateLesson: (id, updates) => {
      set({
        lessons: get().lessons.map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      });
    },

    cancelLesson: (id) => {
      set({
        lessons: get().lessons.map((l) =>
          l.id === id ? { ...l, status: "cancelled" } : l
        ),
      });
    },

    getUpcomingLessons: (uid) => {
      const now = new Date().toISOString().slice(0, 10);
      return get()
        .lessons.filter(
          (l) =>
            l.date >= now &&
            l.status === "scheduled" &&
            (l.studentUid === uid || l.instructorUid === uid)
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    },

    getTodayLessons: (uid) => {
      const today = new Date().toISOString().slice(0, 10);
      return get()
        .lessons.filter(
          (l) =>
            l.date === today &&
            l.status === "scheduled" &&
            (l.studentUid === uid || l.instructorUid === uid)
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },

    markBriefingCompleted: (lessonId) => {
      set({
        lessons: get().lessons.map((l) =>
          l.id === lessonId ? { ...l, briefingCompleted: true } : l
        ),
      });
    },
  })
);
