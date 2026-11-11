import type { ReactNode } from "react";

import { pageFrameClasses } from "./page-frame-classes";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// `flex-1` on main fills the root layout's `flex flex-col` body, so a short
// page keeps the footer at the bottom of the screen.
export function PublicPageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className={`${pageFrameClasses} w-full flex-1 py-12`}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
