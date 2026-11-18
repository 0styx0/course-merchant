"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type NavDestination = { href: string; label: string };

function MenuButton() {
  return (
    <SheetTrigger className="flex size-11 items-center justify-center">
      <MenuIcon aria-hidden="true" />
      <span className="sr-only">Menu</span>
    </SheetTrigger>
  );
}

function MenuSheetContent({
  destinations,
  onLinkTap,
}: {
  destinations: NavDestination[];
  onLinkTap: () => void;
}) {
  return (
    <SheetContent side="right" className="bg-background px-4 pt-14">
      <SheetTitle className="sr-only">Menu</SheetTitle>
      <nav aria-label="Phone">
        {destinations.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            onClick={onLinkTap}
            className="flex min-h-12 items-center"
          >
            {label}
          </Link>
        ))}
      </nav>
    </SheetContent>
  );
}

export function PhoneMenu({
  destinations,
}: {
  destinations: NavDestination[];
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <MenuButton />
      <MenuSheetContent
        destinations={destinations}
        onLinkTap={() => setIsMenuOpen(false)}
      />
    </Sheet>
  );
}
