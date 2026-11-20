import { useEffect } from "react";
import { useLoading } from "../context/LoadingProvider";
import { setProgress } from "./Loading";
import { setAllTimeline } from "./utils/GsapScroll";
import { markNoCharacter, markNoWebGL } from "../utils/webgl";

type Progress = ReturnType<typeof setProgress>;

/**
 * Lets the page continue without the 3D character: finishes the loading
 * screen and starts the scroll animations that do not depend on WebGL.
 *
 * `cause` says why the character is missing. Only a browser without WebGL
 * ("webgl") also loses the 3D tool balls; if just the character failed to
 * load ("character") WebGL still works and the balls are left alone.
 */
export function startWithout3D(
  setLoading: (value: number) => void,
  progress?: Progress,
  cause: "webgl" | "character" = "character"
) {
  if (cause === "webgl") markNoWebGL();
  else markNoCharacter();
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

/** Rendered instead of the character when it cannot be shown. */
const NoWebGLBoot = ({ cause = "character" }: { cause?: "webgl" | "character" }) => {
  const { setLoading } = useLoading();
  useEffect(() => {
    startWithout3D(setLoading, undefined, cause);
  }, []);
  return null;
};

export default NoWebGLBoot;
