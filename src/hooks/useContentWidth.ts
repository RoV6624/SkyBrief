import { useWindowDimensions } from "react-native";

/**
 * Returns a responsive maxWidth for content containers.
 * - iPad landscape (>=1024): 680
 * - iPad portrait (>=768): 600
 * - Phone: undefined (let padding control)
 */
export function useContentWidth(): number | undefined {
  const { width } = useWindowDimensions();
  if (width >= 1024) return 680;
  if (width >= 768) return 600;
  return undefined;
}
