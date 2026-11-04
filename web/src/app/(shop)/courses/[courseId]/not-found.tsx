import Link from "next/link";

export default function CourseNotFound() {
  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">Course not found</h1>
      <p className="mt-2 text-muted-foreground">
        This course doesn&apos;t exist or isn&apos;t available right now.
      </p>
      <Link href="/" className="mt-4 inline-block underline">
        Browse all courses
      </Link>
    </>
  );
}
