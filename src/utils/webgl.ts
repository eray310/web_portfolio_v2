let supported: boolean | undefined;

/**
 * Flags the page so CSS can show the non-3D layout. Only for a browser that
 * really cannot create a WebGL context: it also swaps the 3D tool balls for
 * the static list.
 */
export function markNoWebGL() {
  supported = false;
  document.documentElement.classList.add("no-webgl");
  document.documentElement.classList.remove("char-pending");
}

/**
 * The 3D character could not be shown (model failed to download or decode, or
 * its scene threw) although WebGL itself works. Only the character is skipped;
 * the 3D tool balls keep working.
 */
export function markNoCharacter() {
  document.documentElement.classList.add("no-character");
  document.documentElement.classList.remove("char-pending");
}

/** True when the browser can create a WebGL context (checked once). */
export function hasWebGL(): boolean {
  if (supported !== undefined) return supported;
  let reason = "";
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    supported = !!gl;
    if (!gl) reason = "getContext('webgl2'/'webgl') returned null";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch (error) {
    supported = false;
    reason = String(error);
  }
  if (!supported) {
    // Say why, so a missing 3D scene can be traced in the console.
    console.warn(
      `WebGL is not available in this browser (${reason}); showing the page without 3D. ` +
        "Check that hardware acceleration is enabled (chrome://gpu)."
    );
    markNoWebGL();
  }
  return supported;
}
