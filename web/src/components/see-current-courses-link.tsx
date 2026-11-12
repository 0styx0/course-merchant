import { cn } from "cn";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function SeeCurrentCoursesLink({ className }: { className?: string }) {
  return (
    // The ghost button's px-6 indents the label; -ml-6 cancels it.
    <Link
      href="/"
      className={buttonVariants({
        variant: "ghost",
        className: cn("-ml-6 justify-start", className),
      })}
    >
      See current courses →
    </Link>
  );
}
