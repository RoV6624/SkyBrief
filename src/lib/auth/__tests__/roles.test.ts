import {
  getPermissions,
  hasPermission,
  isInstructorRole,
  isSchoolManager,
  isStaffRole,
  getRoleDisplayName,
  getRoleLevel,
} from "../roles";
import type { UserRole } from "../roles";

describe("getPermissions", () => {
  it("pilot has canBrief but no dispatch", () => {
    const p = getPermissions("pilot");
    expect(p.canBrief).toBe(true);
    expect(p.canDispatch).toBe(false);
    expect(p.canApproveDispatch).toBe(false);
  });

  it("student can dispatch but cannot approve", () => {
    const p = getPermissions("student");
    expect(p.canBrief).toBe(true);
    expect(p.canSubmitForReview).toBe(true);
    expect(p.canDispatch).toBe(true);
    expect(p.canApproveDispatch).toBe(false);
  });

  it("instructor can dispatch and approve", () => {
    const p = getPermissions("instructor");
    expect(p.canReviewBriefings).toBe(true);
    expect(p.canDispatch).toBe(true);
    expect(p.canApproveDispatch).toBe(true);
  });

  it("school_admin can dispatch and approve", () => {
    const p = getPermissions("school_admin");
    expect(p.canManageTemplates).toBe(true);
    expect(p.canDispatch).toBe(true);
    expect(p.canApproveDispatch).toBe(true);
  });

  it("admin has all permissions", () => {
    const p = getPermissions("admin");
    expect(p.canAccessAdmin).toBe(true);
    expect(p.canDispatch).toBe(true);
    expect(p.canApproveDispatch).toBe(true);
  });

  it("falls back to pilot for unknown role", () => {
    expect(getPermissions("unknown" as UserRole)).toEqual(getPermissions("pilot"));
  });
});

describe("hasPermission", () => {
  it("checks canDispatch for student", () => {
    expect(hasPermission("student", "canDispatch")).toBe(true);
  });

  it("checks canDispatch for pilot", () => {
    expect(hasPermission("pilot", "canDispatch")).toBe(false);
  });

  it("checks canApproveDispatch for instructor", () => {
    expect(hasPermission("instructor", "canApproveDispatch")).toBe(true);
  });

  it("checks canApproveDispatch for student", () => {
    expect(hasPermission("student", "canApproveDispatch")).toBe(false);
  });
});

describe("dispatch permissions summary", () => {
  it("only students and higher can create dispatches", () => {
    expect(hasPermission("pilot", "canDispatch")).toBe(false);
    expect(hasPermission("student", "canDispatch")).toBe(true);
    expect(hasPermission("instructor", "canDispatch")).toBe(true);
    expect(hasPermission("school_admin", "canDispatch")).toBe(true);
    expect(hasPermission("admin", "canDispatch")).toBe(true);
  });

  it("only instructors and higher can approve dispatches", () => {
    expect(hasPermission("pilot", "canApproveDispatch")).toBe(false);
    expect(hasPermission("student", "canApproveDispatch")).toBe(false);
    expect(hasPermission("instructor", "canApproveDispatch")).toBe(true);
    expect(hasPermission("school_admin", "canApproveDispatch")).toBe(true);
    expect(hasPermission("admin", "canApproveDispatch")).toBe(true);
  });
});

describe("isInstructorRole", () => {
  it("returns true for instructor", () => expect(isInstructorRole("instructor")).toBe(true));
  it("returns false for school_admin", () => expect(isInstructorRole("school_admin")).toBe(false));
  it("returns false for student", () => expect(isInstructorRole("student")).toBe(false));
  it("returns false for pilot", () => expect(isInstructorRole("pilot")).toBe(false));
  it("returns false for admin", () => expect(isInstructorRole("admin")).toBe(false));
});

describe("isSchoolManager", () => {
  it("returns true for school_admin", () => expect(isSchoolManager("school_admin")).toBe(true));
  it("returns true for admin", () => expect(isSchoolManager("admin")).toBe(true));
  it("returns false for instructor", () => expect(isSchoolManager("instructor")).toBe(false));
  it("returns false for student", () => expect(isSchoolManager("student")).toBe(false));
});

describe("isStaffRole", () => {
  it("returns true for instructor", () => expect(isStaffRole("instructor")).toBe(true));
  it("returns true for school_admin", () => expect(isStaffRole("school_admin")).toBe(true));
  it("returns true for admin", () => expect(isStaffRole("admin")).toBe(true));
  it("returns false for student", () => expect(isStaffRole("student")).toBe(false));
  it("returns false for pilot", () => expect(isStaffRole("pilot")).toBe(false));
});

describe("getRoleDisplayName", () => {
  it("student → Student Pilot", () => expect(getRoleDisplayName("student")).toBe("Student Pilot"));
  it("instructor → Flight Instructor (CFI)", () => expect(getRoleDisplayName("instructor")).toBe("Flight Instructor (CFI)"));
  it("school_admin → School Administrator", () => expect(getRoleDisplayName("school_admin")).toBe("School Administrator"));
  it("admin → Administrator", () => expect(getRoleDisplayName("admin")).toBe("Administrator"));
  it("pilot → Pilot", () => expect(getRoleDisplayName("pilot")).toBe("Pilot"));
  it("unknown → Pilot", () => expect(getRoleDisplayName("unknown" as UserRole)).toBe("Pilot"));
});

describe("getRoleLevel", () => {
  it("hierarchy is correct", () => {
    expect(getRoleLevel("admin")).toBeGreaterThan(getRoleLevel("school_admin"));
    expect(getRoleLevel("school_admin")).toBeGreaterThan(getRoleLevel("instructor"));
    expect(getRoleLevel("instructor")).toBeGreaterThan(getRoleLevel("student"));
  });

  it("unknown returns 0", () => expect(getRoleLevel("unknown" as UserRole)).toBe(0));
});
