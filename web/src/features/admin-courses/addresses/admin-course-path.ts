/** The admin page's address for one course: its details and its students. */
export function adminCourseViewPath(courseId: string) {
  return `/admin/courses/${courseId}`;
}

/** The edit page's address; `savedNote` "draft" makes the page say the course was just saved as a draft. */
export function editCoursePath(courseId: string, savedNote?: "draft") {
  const address = `${adminCourseViewPath(courseId)}/edit`;
  return savedNote === "draft" ? `${address}?saved=draft` : address;
}

/**
 * The web app's address that serves a course's stored image to the logged-in
 * admin. The version in the address makes a browser fetch a replaced image
 * instead of showing the old picture; the route ignores it.
 */
export function adminCourseImagePath(courseId: string, version: string) {
  return `${adminCourseViewPath(courseId)}/image?v=${version}`;
}
