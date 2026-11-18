"use client";

import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Every link keeps the pill's padding and a transparent border, so marking
// the current page adds no padding or border width.
const pillShapeClasses = "rounded-full border border-transparent px-4";

const currentPagePillClasses =
  "border-primary bg-secondary font-semibold text-secondary-foreground";

// A header link that wears the current-page pill (a gold rounded fill, bold
// label and dark border; docs/style-guide.md §7) when the address on screen
// equals its href exactly. Outside Next's router usePathname returns null,
// so no link is marked.
export function HeaderNavLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const isCurrentPage = usePathname() === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isCurrentPage ? "page" : undefined}
      // cn keeps the last of two conflicting Tailwind classes, so the pill's
      // weight and border replace the caller's and the transparent border.
      className={cn(
        pillShapeClasses,
        className,
        isCurrentPage && currentPagePillClasses,
      )}
    >
      {children}
    </Link>
  );
}
