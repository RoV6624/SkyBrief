import { useQuery } from "@tanstack/react-query";
import { getSchoolInstructors } from "@/services/tenant-api";

export interface SchoolInstructor {
  uid: string;
  name: string;
  role: string;
}

/**
 * Fetch all instructors (and school_admins) in a school
 */
export function useSchoolInstructors(tenantId: string | null) {
  return useQuery({
    queryKey: ["school-instructors", tenantId],
    queryFn: async (): Promise<SchoolInstructor[]> => {
      if (!tenantId) return [];
      return getSchoolInstructors(tenantId);
    },
    enabled: !!tenantId,
    staleTime: 300_000,
  });
}
