import Link from "next/link";

import { contactEmail } from "@/lib/site-config/contact-email";
import { SITE_NAME } from "@/lib/site-config/site-name";

import { pageFrameClasses } from "./page-frame-classes";

const footerLinkClass =
  "flex min-h-11 items-center text-muted-foreground hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <nav
        aria-label="Footer"
        className={`${pageFrameClasses} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}
      >
        <Link href="/" className={`${footerLinkClass} font-heading text-h3`}>
          {SITE_NAME}
        </Link>
        <Link href="/" className={`${footerLinkClass} text-sm`}>
          Courses
        </Link>
        <a
          href={`mailto:${contactEmail()}`}
          className={`${footerLinkClass} text-sm`}
        >
          Contact
        </a>
      </nav>
    </footer>
  );
}
