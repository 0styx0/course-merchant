/** The shop's page for one course. */
export function shopCoursePath(courseId: string) {
  return `/courses/${courseId}`;
}

/** The shop's address for one version of a course's image. */
export function shopCourseImagePath(courseId: string, imageVersion: string) {
  return `/courses/${courseId}/image/${imageVersion}`;
}
