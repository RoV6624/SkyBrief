// Development: Force reset before any stores initialize
if (__DEV__) {
  const FORCE_RESET_ON_LAUNCH = false; // Set to true to clear all data on launch

  if (FORCE_RESET_ON_LAUNCH) {
    // Set a global flag that tells the app to ignore Firebase auth
    // This works even if Firebase restores a session from iOS Keychain
    (global as any).__FORCE_RESET__ = true;

    // Import Firebase auth
    const auth = require("@react-native-firebase/auth").default;

    // Clear Firebase auth (async - may complete after app loads)
    // This prevents Firebase from restoring the session
    auth()
      .signOut()
      .then(() => {
        console.log("[DEV] Firebase sign out completed");
      })
      .catch((error: any) => {
        console.warn("[DEV] Firebase sign out failed:", error);
      });

    // Clear MMKV storage synchronously
    try {
      const { storage } = require("./src/services/storage");
      storage.clearAll();
      console.log("[DEV] Force reset - cleared all storage before app init");
    } catch (error) {
      console.warn("[DEV] Failed to clear storage:", error);
    }
  }
}

import "expo-router/entry";
