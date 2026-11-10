import Link from "next/link";

import { SITE_NAME } from "@/lib/site-config/site-name";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 h-14 md:h-18 bg-background px-4 md:px-6">
      <nav
        aria-label="Main"
        className="mx-auto flex h-full max-w-6xl items-center justify-between"
      >
        <Link
          href="/"
          className="flex min-h-11 items-center font-heading text-h3"
        >
          {SITE_NAME}
        </Link>
        <Link href="/" className="flex min-h-11 items-center">
          Courses
        </Link>
      </nav>
    </header>
  );
}
