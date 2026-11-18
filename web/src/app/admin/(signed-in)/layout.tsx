import type { ReactNode } from "react";

import { AdminHeader } from "@/features/site-layout/header/admin-header";

// Each admin page renders its own <main>, so this layout adds only the header.
export default function AdminSignedInLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}
