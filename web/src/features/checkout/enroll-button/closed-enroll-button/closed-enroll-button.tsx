import type { ReactNode } from "react";
import { OpenFieldsButton } from "./open-fields-button";
import { PhoneBuyBar } from "./phone-buy-bar";
import { useScrolledAboveHeader } from "./use-scrolled-above-header";

type ClosedEnrollButtonProps = {
  label: string;
  onOpen: () => void;
  /** Shown under the button. */
  note: ReactNode;
};

/** The enroll button before its fields open; on a phone a bar repeats it once the button scrolls away. */
export function ClosedEnrollButton({
  label,
  onOpen,
  note,
}: ClosedEnrollButtonProps) {
  const [buttonRef, isButtonScrolledPast] =
    useScrolledAboveHeader<HTMLButtonElement>();

  return (
    <>
      <OpenFieldsButton
        ref={buttonRef}
        label={label}
        onOpen={onOpen}
        className="mt-6 w-full"
      />
      {note}
      {isButtonScrolledPast && <PhoneBuyBar label={label} onOpen={onOpen} />}
    </>
  );
}
