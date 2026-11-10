import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

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
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", className: "mt-4" })}
      >
        See current courses →
      </Link>
    </>
  );
}
