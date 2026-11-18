import { SITE_NAME } from "@/lib/site-config/site-name";

import { HeaderNav, wordmarkClasses } from "./header-nav";

const adminDestinations = [
  { href: "/admin/courses/new", label: "New course" },
  { href: "/admin/students", label: "Students" },
];

export function AdminHeader() {
  return (
    <header className="h-14 md:h-18 bg-background">
      <HeaderNav
        wordmark={<span className={wordmarkClasses}>{SITE_NAME} · Admin</span>}
        destinations={adminDestinations}
      />
    </header>
  );
}
