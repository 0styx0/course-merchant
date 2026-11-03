/**
 * The web app's address that serves a course's stored image to the logged-in
 * admin. The version in the address makes a browser fetch a replaced image
 * instead of showing the old picture; the route ignores it.
 */
export function adminCourseImagePath(courseId: string, version: string) {
  return `/admin/courses/${courseId}/image?v=${version}`;
}
