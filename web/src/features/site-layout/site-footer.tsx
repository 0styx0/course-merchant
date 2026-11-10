import Link from "next/link";

import { contactEmail } from "@/lib/site-config/contact-email";
import { SITE_NAME } from "@/lib/site-config/site-name";

const footerLinkClass =
  "flex min-h-11 items-center text-muted-foreground hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-4 py-12 md:px-6">
      <nav
        aria-label="Footer"
        className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between"
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
