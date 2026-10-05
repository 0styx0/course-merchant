import { getCourses } from "@/lib/api/courses";
import { CoursesView } from "./courses-view";

export default async function Courses() {
    const result = await getCourses();
  
    return <CoursesView result={result} />;
  }