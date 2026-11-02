/** The web app's address that serves a course's stored image to the logged-in admin. */
export function adminCourseImagePath(courseId: string) {
  return `/admin/courses/${courseId}/image`;
}
