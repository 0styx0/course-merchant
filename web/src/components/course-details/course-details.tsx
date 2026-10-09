import { CourseDetailsView } from "@/components/course-details/course-details-view";
import { getCourse } from "@/lib/api/course.get";

interface CourseDetailsProps {
  courseId: string;
}

export default async function CourseDetails({ courseId }: CourseDetailsProps) {
  const result = await getCourse(courseId);

  return <CourseDetailsView result={result} />;
}
