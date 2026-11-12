import type { Ref } from "react";
import { Button } from "@/components/ui/button";

type OpenFieldsButtonProps = {
  label: string;
  onOpen: () => void;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
};

/** The closed enroll button: its label and an arrow, and a tap opens the enrollment fields. */
export function OpenFieldsButton({
  label,
  onOpen,
  className,
  ref,
}: OpenFieldsButtonProps) {
  return (
    <Button
      ref={ref}
      type="button"
      aria-expanded={false}
      className={className}
      onClick={onOpen}
    >
      {label} <span aria-hidden="true">→</span>
    </Button>
  );
}
