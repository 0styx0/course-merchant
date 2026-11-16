import { CourseImage } from "@/features/courses/course-image";
import type { AdminCourse } from "@/lib/types";

import { adminCourseImagePath } from "../addresses/admin-course-path";

type AdminCourseImageProps = {
  courseId: string;
  image: AdminCourse["image"];
};

/** The course's stored image from the admin route, or an empty 16:9 box. */
export function AdminCourseImage({ courseId, image }: AdminCourseImageProps) {
  if (image === null) {
    return <div className="aspect-video w-full bg-muted" />;
  }
  return (
    <CourseImage
      isUnoptimized
      src={adminCourseImagePath(courseId, image.version)}
    />
  );
}
