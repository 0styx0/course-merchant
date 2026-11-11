import { SeeCurrentCoursesLink } from "@/components/see-current-courses-link";

export function NotFoundMessage({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">{title}</h1>
      <p className="mt-2 text-muted-foreground">{detail}</p>
      <SeeCurrentCoursesLink className="mt-4" />
    </>
  );
}
