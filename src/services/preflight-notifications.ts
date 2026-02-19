/**
 * Preflight Local Notifications
 *
 * Sends immediate local notifications for weather changes detected
 * during an active preflight monitoring session. Uses expo-notifications
 * for cross-platform support.
 */

import * as Notifications from "expo-notifications";

// ── Configure notification handler ──────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Send an immediate local notification for a preflight weather change.
 *
 * @param title - Notification title (e.g. "Weather Alert — KJFK")
 * @param body  - Notification body describing the change
 */
export async function sendPreflightNotification(
  title: string,
  body: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
        data: { type: "preflight-weather-change" },
      },
      trigger: null, // immediate delivery
    });
  } catch (error) {
    console.warn("[PreflightNotifications] Failed to send notification:", error);
  }
}

/**
 * Request notification permissions from the user.
 * Should be called before starting a preflight session.
 *
 * @returns true if permissions were granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    if (existingStatus === "granted") return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.warn(
      "[PreflightNotifications] Failed to request permissions:",
      error
    );
    return false;
  }
}

/**
 * Cancel all pending preflight notifications.
 * Called when stopping a preflight session.
 */
export async function cancelPreflightNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn(
      "[PreflightNotifications] Failed to cancel notifications:",
      error
    );
  }
}
