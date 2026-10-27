import { listCourses } from "./courses.api";
import { CourseList } from "./course-list";

export async function CourseListSection() {
  const { courses } = await listCourses();

  return <CourseList courses={courses} />;
}
