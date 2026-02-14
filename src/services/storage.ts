import { MMKV } from "react-native-mmkv";
import { type StateStorage } from "zustand/middleware";

export const storage = new MMKV({ id: "skybrief-storage" });

// Zustand-compatible storage adapter for MMKV
export const zustandMMKVStorage: StateStorage = {
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    storage.set(name, value);
  },
  removeItem: (name: string) => {
    storage.delete(name);
  },
};
