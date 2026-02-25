import { useQuery } from "@tanstack/react-query";
import {
  FIRESTORE_API_URL,
  firestoreValueToJS,
  jsToFirestoreValue,
} from "@/services/firebase";
import type { SubmittedPirep } from "@/services/pirep-submit";

/**
 * Fetch community PIREPs from Firestore for a given station.
 * Only returns PIREPs submitted within the last 6 hours.
 */
async function fetchCommunityPireps(station: string): Promise<SubmittedPirep[]> {
  if (!FIRESTORE_API_URL || !station) return [];

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const query = {
    structuredQuery: {
      from: [{ collectionId: "pireps" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: "nearestStation" },
                op: "EQUAL",
                value: jsToFirestoreValue(station.toUpperCase()),
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: "submittedAt" },
                op: "GREATER_THAN_OR_EQUAL",
                value: jsToFirestoreValue(sixHoursAgo),
              },
            },
          ],
        },
      },
      orderBy: [{ field: { fieldPath: "submittedAt" }, direction: "DESCENDING" }],
      limit: 20,
    },
  };

  try {
    const parentUrl = FIRESTORE_API_URL.replace(/\/documents$/, "/documents");
    const response = await fetch(`${parentUrl}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });

    if (!response.ok) return [];

    const results = await response.json();
    if (!Array.isArray(results)) return [];

    return results
      .filter((r: any) => r.document)
      .map((r: any) => {
        const fields = r.document.fields || {};
        const id = r.document.name?.split("/").pop() ?? "";
        return {
          id,
          nearestStation: firestoreValueToJS(fields.nearestStation) ?? station,
          altitude: firestoreValueToJS(fields.altitude) ?? 0,
          aircraftType: firestoreValueToJS(fields.aircraftType) ?? "",
          turbulence: firestoreValueToJS(fields.turbulence) ?? undefined,
          icing: firestoreValueToJS(fields.icing) ?? undefined,
          skyCondition: firestoreValueToJS(fields.skyCondition) ?? undefined,
          cloudBase: firestoreValueToJS(fields.cloudBase) ?? undefined,
          cloudTop: firestoreValueToJS(fields.cloudTop) ?? undefined,
          flightVisibility: firestoreValueToJS(fields.flightVisibility) ?? undefined,
          temperature: firestoreValueToJS(fields.temperature) ?? undefined,
          windDirection: firestoreValueToJS(fields.windDirection) ?? undefined,
          windSpeed: firestoreValueToJS(fields.windSpeed) ?? undefined,
          remarks: firestoreValueToJS(fields.remarks) ?? undefined,
          submittedBy: firestoreValueToJS(fields.submittedBy) ?? "",
          submittedAt: firestoreValueToJS(fields.submittedAt) ?? "",
          upvotes: firestoreValueToJS(fields.upvotes) ?? 0,
        } as SubmittedPirep;
      });
  } catch (error) {
    console.warn("[CommunityPIREPs] Failed to fetch:", error);
    return [];
  }
}

export function useCommunityPireps(station: string | null) {
  return useQuery({
    queryKey: ["community-pireps", station],
    queryFn: () => fetchCommunityPireps(station!),
    enabled: !!station,
    staleTime: 300_000, // 5 minutes
    gcTime: 600_000, // 10 minutes
  });
}
