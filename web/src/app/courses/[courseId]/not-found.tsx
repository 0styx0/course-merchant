import Link from "next/link";

export default function CourseNotFound() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold">Course not found</h1>
      <p className="mt-2 text-gray-600">
        This course doesn&apos;t exist or isn&apos;t available right now.
      </p>
      <Link href="/" className="mt-4 inline-block underline">
        Browse all courses
      </Link>
    </main>
  );
}
