import { useEffect } from "react";
import { useLoading } from "../context/LoadingProvider";
import { setProgress } from "./Loading";
import { setAllTimeline } from "./utils/GsapScroll";
import { markNoWebGL } from "../utils/webgl";

type Progress = ReturnType<typeof setProgress>;

/**
 * Lets the page continue without the 3D character: finishes the loading
 * screen and starts the scroll animations that do not depend on WebGL.
 */
export function startWithout3D(
  setLoading: (value: number) => void,
  progress?: Progress
) {
  markNoWebGL();
  if (progress) {
    progress.clear();
  } else {
    setProgress(setLoading).loaded();
  }
  try {
    setAllTimeline();
  } catch (error) {
    console.error(error);
  }
}

/** Rendered instead of the character when WebGL is not available. */
const NoWebGLBoot = () => {
  const { setLoading } = useLoading();
  useEffect(() => {
    startWithout3D(setLoading);
  }, []);
  return null;
};

export default NoWebGLBoot;
