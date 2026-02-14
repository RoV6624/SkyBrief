/**
 * Zustand store middleware helpers
 *
 * Provides reusable middleware patterns for all stores,
 * including MMKV persistence with optional logging.
 */

import { create, StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/services/storage";

export interface PersistOptions<T> {
  /**
   * Select which parts of state to persist
   * By default, entire state is persisted
   */
  partialize?: (state: T) => Partial<T>;

  /**
   * Callback when state is rehydrated from storage
   * Useful for logging or migration
   */
  onRehydrate?: (state: T | undefined) => void;
}

/**
 * Create a Zustand store with MMKV persistence
 *
 * @param name - Store name (will be prefixed with 'skybrief-')
 * @param stateCreator - Zustand state creator function
 * @param options - Persistence options
 * @returns Configured Zustand store hook
 *
 * @example
 * ```ts
 * export const useWeatherStore = createPersistedStore<WeatherStore>(
 *   'weather',
 *   (set, get) => ({
 *     selectedStation: null,
 *     setStation: (icao) => set({ selectedStation: icao.toUpperCase() }),
 *   }),
 *   {
 *     onRehydrate: (state) => {
 *       console.log('[WeatherStore] Rehydrated:', state?.selectedStation);
 *     }
 *   }
 * );
 * ```
 */
export function createPersistedStore<T>(
  name: string,
  stateCreator: StateCreator<T>,
  options?: PersistOptions<T>
) {
  // Build config object, only including optional properties if they're defined
  const config: any = {
    name: `skybrief-${name}`,
    storage: createJSONStorage(() => zustandMMKVStorage),
  };

  // Only add partialize if it's actually provided
  if (options?.partialize) {
    config.partialize = options.partialize;
  }

  // Only add onRehydrateStorage if it's provided
  if (options?.onRehydrate) {
    config.onRehydrateStorage = () => options.onRehydrate;
  }

  return create<T>()(persist(stateCreator, config));
}

/**
 * Create a non-persisted Zustand store
 *
 * @param stateCreator - Zustand state creator function
 * @returns Configured Zustand store hook
 *
 * @example
 * ```ts
 * export const useUIStore = createStore<UIStore>((set, get) => ({
 *   isModalOpen: false,
 *   setModalOpen: (open) => set({ isModalOpen: open }),
 * }));
 * ```
 */
export function createStore<T>(stateCreator: StateCreator<T>) {
  return create<T>()(stateCreator);
}
