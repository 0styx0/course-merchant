import Link from "next/link";
import type { ReactNode } from "react";

import { pageFrameClasses } from "../page-frame/page-frame-classes";
import { PhoneMenu, type NavDestination } from "./phone-menu";

export const wordmarkClasses =
  "flex min-h-11 items-center font-heading text-h3";

export function HeaderNav({
  wordmark,
  destinations,
}: {
  wordmark: ReactNode;
  destinations: NavDestination[];
}) {
  return (
    <nav
      aria-label="Main"
      className={`${pageFrameClasses} flex h-full items-center justify-between`}
    >
      {wordmark}
      {destinations.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="hidden min-h-11 items-center text-meta font-medium md:flex"
        >
          {label}
        </Link>
      ))}
      <div className="md:hidden">
        <PhoneMenu destinations={destinations} />
      </div>
    </nav>
  );
}
