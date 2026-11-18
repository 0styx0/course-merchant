import type { ReactNode } from "react";

import { pageFrameClasses } from "./page-frame-classes";

/**
 * The `main` of an admin page that lists students, as wide as the public
 * course page. `w-full` keeps the frame at the screen's width: the root
 * layout's body (app/layout.tsx) is a flex column, which sizes an auto-margin
 * child to its content, so a wide students table would stretch the page
 * sideways.
 */
export function AdminPageFrame({ children }: { children: ReactNode }) {
  return <main className={`${pageFrameClasses} w-full py-12`}>{children}</main>;
}
