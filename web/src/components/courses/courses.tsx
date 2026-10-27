import { getCourses } from "@/lib/api/courses.list";
import { CoursesView } from "./courses-view";

export default async function Courses() {
  const { courses } = await getCourses();

  return <CoursesView courses={courses} />;
}
