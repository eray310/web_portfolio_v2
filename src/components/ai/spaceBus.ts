/**
 * What the page tells the space scene (read every frame, no re-render needed):
 *  - playerOpen: a video player is open; the background calms down so it does not compete with it
 *  - briefOpen:  the brief form covers the page; the scene stops drawing
 */
export const spaceBus = {
  playerOpen: false,
  briefOpen: false,
};
