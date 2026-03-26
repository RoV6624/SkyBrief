/**
 * RevenueCat SDK wrapper for in-app purchases and subscriptions.
 */
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";

/** Product identifiers configured in App Store Connect + RevenueCat dashboard */
export const PRODUCT_IDS = {
  monthly: "pro_sub_monthly",
  annual: "pro_sub_annual",
} as const;

/** RevenueCat entitlement identifier */
export const ENTITLEMENT_ID = "SkyBrief Pro";

export type CustomerInfoListener = (info: CustomerInfo) => void;

let isConfigured = false;

/**
 * Initialize the RevenueCat SDK.
 * Call once after Firebase auth resolves.
 */
export async function initRevenueCat(userId?: string): Promise<void> {
  if (isConfigured) return;
  if (!REVENUECAT_IOS_KEY) {
    console.warn("[RevenueCat] No API key configured — skipping init");
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey: REVENUECAT_IOS_KEY,
    appUserID: userId ?? undefined,
  });

  isConfigured = true;
  console.log("[RevenueCat] Configured", userId ? `for user ${userId}` : "anonymously");
}

/**
 * Fetch available offerings (packages with pricing).
 */
export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

/**
 * Execute a purchase for the given package.
 * Returns the updated CustomerInfo on success.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * Restore previously purchased subscriptions.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

/**
 * Get the current customer subscription info.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

/**
 * Check if the customer has an active premium entitlement.
 */
export function hasPremiumEntitlement(info: CustomerInfo): boolean {
  return ENTITLEMENT_ID in info.entitlements.active;
}

/**
 * Listen for real-time subscription status changes
 * (e.g., user cancels/renews via App Store settings).
 * Returns an unsubscribe function.
 */
export function addCustomerInfoListener(
  listener: CustomerInfoListener
): () => void {
  const remove = Purchases.addCustomerInfoUpdateListener(listener);
  return remove;
}
