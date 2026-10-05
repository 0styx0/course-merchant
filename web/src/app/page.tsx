import Courses from "@/components/courses/courses";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header>
        <h1 className="text-4xl font-bold">Courses</h1>
        <p className="mt-2 text-gray-600">
          Browse currently available courses.
        </p>
      </header>

      <div className="mt-12">
        <Courses />
      </div>
    </main>
  );
}