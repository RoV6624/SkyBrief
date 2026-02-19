import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminLayout() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/(tabs)/settings" as any);
    }
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
