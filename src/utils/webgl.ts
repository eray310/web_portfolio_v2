let supported: boolean | undefined;

/** Flags the page so CSS can show the non-3D layout. */
export function markNoWebGL() {
  supported = false;
  document.documentElement.classList.add("no-webgl");
}

/** True when the browser can create a WebGL context (checked once). */
export function hasWebGL(): boolean {
  if (supported !== undefined) return supported;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    supported = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    supported = false;
  }
  if (!supported) markNoWebGL();
  return supported;
}
