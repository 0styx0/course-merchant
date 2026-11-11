// The image both mock image endpoints (public and admin) serve back, a real 1×1
// WebP so a browser in `yarn dev:mock` can draw it. Browser tests upload `course-image.png`.
export const mockCourseImageBytes = Uint8Array.from(
  atob("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=="),
  (character) => character.charCodeAt(0),
);
