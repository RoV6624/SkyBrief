/**
 * Role-Based Access Control for SkyBrief Flight School
 *
 * Roles:
 * - student: Full briefing features, submit briefings for CFI review
 * - instructor: Review/approve student briefings, view student analytics
 * - chief_instructor: School-wide analytics, manage templates, configure school
 * - admin: Multi-tenant management, system administration
 */

export type UserRole = "student" | "instructor" | "chief_instructor" | "admin" | "pilot";

export interface RolePermissions {
  canBrief: boolean;
  canSubmitForReview: boolean;
  canReviewBriefings: boolean;
  canApproveStudents: boolean;
  canManageTemplates: boolean;
  canViewSchoolAnalytics: boolean;
  canManageInstructors: boolean;
  canManageTenant: boolean;
  canAccessAdmin: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  pilot: {
    canBrief: true,
    canSubmitForReview: false,
    canReviewBriefings: false,
    canApproveStudents: false,
    canManageTemplates: false,
    canViewSchoolAnalytics: false,
    canManageInstructors: false,
    canManageTenant: false,
    canAccessAdmin: false,
  },
  student: {
    canBrief: true,
    canSubmitForReview: true,
    canReviewBriefings: false,
    canApproveStudents: false,
    canManageTemplates: false,
    canViewSchoolAnalytics: false,
    canManageInstructors: false,
    canManageTenant: false,
    canAccessAdmin: false,
  },
  instructor: {
    canBrief: true,
    canSubmitForReview: false,
    canReviewBriefings: true,
    canApproveStudents: true,
    canManageTemplates: false,
    canViewSchoolAnalytics: false,
    canManageInstructors: false,
    canManageTenant: false,
    canAccessAdmin: false,
  },
  chief_instructor: {
    canBrief: true,
    canSubmitForReview: false,
    canReviewBriefings: true,
    canApproveStudents: true,
    canManageTemplates: true,
    canViewSchoolAnalytics: true,
    canManageInstructors: true,
    canManageTenant: true,
    canAccessAdmin: false,
  },
  admin: {
    canBrief: true,
    canSubmitForReview: false,
    canReviewBriefings: true,
    canApproveStudents: true,
    canManageTemplates: true,
    canViewSchoolAnalytics: true,
    canManageInstructors: true,
    canManageTenant: true,
    canAccessAdmin: true,
  },
};

/**
 * Get permissions for a given role
 */
export function getPermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.pilot;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: UserRole,
  permission: keyof RolePermissions
): boolean {
  return getPermissions(role)[permission];
}

/**
 * Check if role is an instructor-type role (CFI or Chief)
 */
export function isInstructorRole(role: UserRole): boolean {
  return role === "instructor" || role === "chief_instructor";
}

/**
 * Check if role has school management capabilities
 */
export function isSchoolManager(role: UserRole): boolean {
  return role === "chief_instructor" || role === "admin";
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "student":
      return "Student Pilot";
    case "instructor":
      return "Flight Instructor (CFI)";
    case "chief_instructor":
      return "Chief Flight Instructor";
    case "admin":
      return "Administrator";
    case "pilot":
      return "Pilot";
    default:
      return "Pilot";
  }
}

/**
 * Get role hierarchy level (higher = more access)
 */
export function getRoleLevel(role: UserRole): number {
  switch (role) {
    case "student":
      return 1;
    case "pilot":
      return 1;
    case "instructor":
      return 2;
    case "chief_instructor":
      return 3;
    case "admin":
      return 4;
    default:
      return 0;
  }
}
