import tourConfig from './tour.json';

export const TOUR_DATA = tourConfig;

export const TIEN_SU_TOUR_SCENES = tourConfig.scenes.map((scene) => ({
  ...scene,
  initialYaw: scene.initialView?.yaw ?? 0,
  initialPitch: scene.initialView?.pitch ?? 0,
  initialFov: scene.initialView?.fov ?? 75,
}));

export default TIEN_SU_TOUR_SCENES;
