import { create } from "zustand";
import { DEFAULT_SCENE, type WeatherScene } from "@/lib/weather/scene-mapper";

interface SceneStore {
  scene: WeatherScene;
  setScene: (scene: WeatherScene) => void;
}

export const useSceneStore = create<SceneStore>()((set) => ({
  scene: DEFAULT_SCENE,
  setScene: (scene) => set({ scene }),
}));
