/**
 * Push Token Registration
 *
 * Captures the Expo push token for the device and stores it in
 * the Firestore users/{uid} document so the backend can send
 * targeted push notifications.
 */

import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  FIRESTORE_API_URL,
  jsToFirestoreValue,
  safeCurrentUser,
} from "./firebase";

/**
 * Get the Expo push token and store it in Firestore.
 *
 * @returns The Expo push token string, or null if unavailable
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // 1. Request notification permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[PushToken] Permission not granted");
      return null;
    }

    // 2. Configure Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#D4A853",
      });
    }

    // 3. Get the Expo project ID
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn(
        "[PushToken] No EAS project ID found — push tokens unavailable"
      );
      return null;
    }

    // 4. Retrieve the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log("[PushToken] Token retrieved:", token.substring(0, 20) + "...");

    // 5. Store in Firestore under users/{uid}.pushToken
    await storePushTokenInFirestore(token);

    return token;
  } catch (error) {
    console.error("[PushToken] Failed to register push token:", error);
    return null;
  }
}

/**
 * Persist the push token to the user's Firestore document.
 */
async function storePushTokenInFirestore(token: string): Promise<void> {
  if (!FIRESTORE_API_URL) {
    console.warn("[PushToken] Firestore disabled — skipping token storage");
    return;
  }

  const currentUser = safeCurrentUser();
  if (!currentUser) {
    console.log("[PushToken] No authenticated user — skipping token storage");
    return;
  }

  try {
    const idToken = await currentUser.getIdToken();
    const docUrl = `${FIRESTORE_API_URL}/users/${currentUser.uid}`;

    const firestoreDoc = {
      fields: {
        pushToken: jsToFirestoreValue(token),
        pushTokenUpdatedAt: jsToFirestoreValue(new Date()),
        pushTokenPlatform: jsToFirestoreValue(Platform.OS),
      },
    };

    const updateMask = [
      "updateMask.fieldPaths=pushToken",
      "updateMask.fieldPaths=pushTokenUpdatedAt",
      "updateMask.fieldPaths=pushTokenPlatform",
    ].join("&");

    const response = await fetch(`${docUrl}?${updateMask}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(firestoreDoc),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[PushToken] Firestore update failed:",
        response.status,
        errorText
      );
      return;
    }

    console.log("[PushToken] Token stored in Firestore successfully");
  } catch (error) {
    console.error("[PushToken] Failed to store token in Firestore:", error);
  }
}

/**
 * Remove the push token from Firestore (e.g., on sign out).
 */
export async function removePushToken(): Promise<void> {
  if (!FIRESTORE_API_URL) return;

  const currentUser = safeCurrentUser();
  if (!currentUser) return;

  try {
    const idToken = await currentUser.getIdToken();
    const docUrl = `${FIRESTORE_API_URL}/users/${currentUser.uid}`;

    const firestoreDoc = {
      fields: {
        pushToken: jsToFirestoreValue(null),
        pushTokenUpdatedAt: jsToFirestoreValue(new Date()),
      },
    };

    const updateMask = [
      "updateMask.fieldPaths=pushToken",
      "updateMask.fieldPaths=pushTokenUpdatedAt",
    ].join("&");

    await fetch(`${docUrl}?${updateMask}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(firestoreDoc),
    });

    console.log("[PushToken] Token removed from Firestore");
  } catch (error) {
    console.warn("[PushToken] Failed to remove token:", error);
  }
}
