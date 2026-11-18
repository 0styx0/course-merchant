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

function MenuButton() {
  return (
    <SheetTrigger className="flex size-11 items-center justify-center">
      <MenuIcon aria-hidden="true" />
      <span className="sr-only">Menu</span>
    </SheetTrigger>
  );
}

function MenuSheetContent({ onLinkTap }: { onLinkTap: () => void }) {
  return (
    <SheetContent side="right" className="bg-background px-4 pt-14">
      <SheetTitle className="sr-only">Menu</SheetTitle>
      <nav aria-label="Phone">
        <Link
          href="/"
          onClick={onLinkTap}
          className="flex min-h-12 items-center"
        >
          Courses
        </Link>
      </nav>
    </SheetContent>
  );
}

export function PhoneMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <MenuButton />
      <MenuSheetContent onLinkTap={() => setIsMenuOpen(false)} />
    </Sheet>
  );
}
