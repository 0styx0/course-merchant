import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function CheckoutNotFound() {
  return (
    <>
      <h1 className="font-heading text-h2 md:text-h1">Checkout not found</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn&apos;t find a checkout for this link. If you paid, look in
        your email for your access link.
      </p>
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", className: "mt-4" })}
      >
        See current courses →
      </Link>
    </>
  );
}
