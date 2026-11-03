/** The edit page's address; `savedNote` "draft" makes the page say the course was just saved as a draft. */
export function editCoursePath(courseId: string, savedNote?: "draft") {
  const address = `/admin/courses/${courseId}/edit`;
  return savedNote === "draft" ? `${address}?saved=draft` : address;
}
