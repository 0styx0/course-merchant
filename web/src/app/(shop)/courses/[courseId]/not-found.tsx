import { NotFoundMessage } from "@/components/not-found-message";

export default function CourseNotFound() {
  return (
    <NotFoundMessage
      title="Course not found"
      detail="This course doesn't exist or isn't available right now."
    />
  );
}
