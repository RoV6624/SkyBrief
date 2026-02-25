/**
 * Instructor Hub — routing gateway that renders the appropriate dashboard
 * based on the user's role:
 * - school_admin / admin → AdminDashboard (school-wide view)
 * - instructor → InstructorDashboard (focused on their students)
 */

import { useAuthStore } from "@/stores/auth-store";
import { isSchoolManager } from "@/lib/auth/roles";
import { AdminDashboard } from "@/components/instructor/AdminDashboard";
import { InstructorDashboard } from "@/components/instructor/InstructorDashboard";

export default function InstructorHubScreen() {
  const { role } = useAuthStore();

  if (role && isSchoolManager(role)) {
    return <AdminDashboard />;
  }

  return <InstructorDashboard />;
}
