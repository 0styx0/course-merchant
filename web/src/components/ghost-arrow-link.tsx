import { cn } from "cn";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";

type GhostArrowLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function GhostArrowLink({
  href,
  children,
  className,
}: GhostArrowLinkProps) {
  return (
    // The ghost button's px-6 indents the label; -ml-6 cancels it.
    <Link
      href={href}
      className={buttonVariants({
        variant: "ghost",
        className: cn("-ml-6 justify-start", className),
      })}
    >
      {children}
    </Link>
  );
}
