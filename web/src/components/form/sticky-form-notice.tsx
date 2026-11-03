import type { AriaRole, ComponentProps } from "react";

import { cn } from "cn";

type StickyFormNoticeProps = ComponentProps<"div"> & {
  /** Screen readers need to know whether the notice is an alert or a status. */
  role: AriaRole;
};

/**
 * The box at the top of a form that stays in view while the admin scrolls. The
 * caller picks the role and the colour.
 */
export function StickyFormNotice({
  className,
  ...divProps
}: StickyFormNoticeProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 rounded-lg border bg-background p-4 text-sm",
        className,
      )}
      {...divProps}
    />
  );
}
