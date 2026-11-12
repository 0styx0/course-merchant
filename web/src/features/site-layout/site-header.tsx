import Link from "next/link";

import { SITE_NAME } from "@/lib/site-config/site-name";

import { pageFrameClasses } from "./page-frame-classes";
import { PhoneMenu } from "./phone-menu";

export function SiteHeader() {
  return (
    <header
      data-site-header
      className="sticky top-0 z-10 h-14 md:h-18 bg-background"
    >
      <nav
        aria-label="Main"
        className={`${pageFrameClasses} flex h-full items-center justify-between`}
      >
        <Link
          href="/"
          className="flex min-h-11 items-center font-heading text-h3"
        >
          {SITE_NAME}
        </Link>
        <Link
          href="/"
          className="hidden min-h-11 items-center text-meta font-medium md:flex"
        >
          Courses
        </Link>
        <div className="md:hidden">
          <PhoneMenu />
        </div>
      </nav>
    </header>
  );
}
