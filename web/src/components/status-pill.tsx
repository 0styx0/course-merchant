import type { ReactNode } from "react";

const PILL_CLASS = "inline-block rounded-full px-3 py-1 text-eyebrow uppercase";

const pillColourClasses = {
  success: "bg-success text-success-foreground",
  muted: "bg-muted text-muted-foreground",
};

type StatusPillProps = {
  /** Which pair of background and text colours the pill wears. */
  colourPair: keyof typeof pillColourClasses;
  children: ReactNode;
};

/** A status word in a rounded pill, in one of the style guide's colour pairs (§7). */
export function StatusPill({ colourPair, children }: StatusPillProps) {
  return (
    <span className={`${PILL_CLASS} ${pillColourClasses[colourPair]}`}>
      {children}
    </span>
  );
}
