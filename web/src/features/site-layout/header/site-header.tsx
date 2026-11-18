import Link from "next/link";

import { SITE_NAME } from "@/lib/site-config/site-name";

import { HeaderNav, wordmarkClasses } from "./header-nav";

// The phone buy bar finds this header by `data-site-header`
// (use-scrolled-above-header.ts) and appears once the Enroll button scrolls
// under it.
export function SiteHeader() {
  return (
    <header
      data-site-header
      className="sticky top-0 z-10 h-14 md:h-18 bg-background"
    >
      <HeaderNav
        wordmark={
          <Link href="/" className={wordmarkClasses}>
            {SITE_NAME}
          </Link>
        }
        destinations={[{ href: "/", label: "Courses" }]}
      />
    </header>
  );
}
