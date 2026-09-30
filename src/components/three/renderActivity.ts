// A wake-up line into the Canvas's on-demand render loop, for things that
// change the scene outside React and the store (textures and data arriving).
// RenderGovernor installs the listener; before it mounts this is a no-op.

let listener: (() => void) | null = null;

export function setRenderWakeListener(fn: (() => void) | null) {
  listener = fn;
}

/** Keep rendering for a while: something in the scene just changed. */
export function wakeRenderer() {
  listener?.();
}
