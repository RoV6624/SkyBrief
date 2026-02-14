import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="minimums" />
      <Stack.Screen name="aircraft" />
      <Stack.Screen name="permissions" />
    </Stack>
  );
}
