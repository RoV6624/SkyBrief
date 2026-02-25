import { createPersistedStore } from "./middleware";

export interface TenantBranding {
  schoolName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface TenantConfig {
  id: string;
  branding: TenantBranding;
  features: {
    briefingTemplates: boolean;
    cfiReview: boolean;
    studentProgress: boolean;
    schoolAnalytics: boolean;
    lessonPlans: boolean;
    dispatch: boolean;
  };
  defaultTemplateIds: string[];
  adminEmail?: string;
}

interface TenantStore {
  // State
  tenantId: string | null;
  tenantConfig: TenantConfig | null;
  isSchoolMode: boolean;

  // Actions
  setTenant: (config: TenantConfig) => void;
  clearTenant: () => void;
}

export const useTenantStore = createPersistedStore<TenantStore>(
  "tenant",
  (set) => ({
    tenantId: null,
    tenantConfig: null,
    isSchoolMode: false,

    setTenant: (config) =>
      set({
        tenantId: config.id,
        tenantConfig: config,
        isSchoolMode: true,
      }),

    clearTenant: () =>
      set({
        tenantId: null,
        tenantConfig: null,
        isSchoolMode: false,
      }),
  }),
  {
    partialize: (state) => ({
      tenantId: state.tenantId,
      tenantConfig: state.tenantConfig,
      isSchoolMode: state.isSchoolMode,
    }),
  }
);
