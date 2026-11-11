import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function SeeCurrentCoursesLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={buttonVariants({ variant: "ghost", className })}>
      See current courses →
    </Link>
  );
}
