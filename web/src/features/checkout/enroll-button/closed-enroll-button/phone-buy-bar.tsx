import { OpenFieldsButton } from "./open-fields-button";

type PhoneBuyBarProps = {
  label: string;
  onOpen: () => void;
};

/**
 * Keeps the enroll button on screen at the bottom of a phone once the inline
 * one has scrolled away. The marker lets globals.css clear room under the page
 * so the bar never covers the footer. Side padding matches the page's phone
 * gutter (`px-6`).
 */
export function PhoneBuyBar({ label, onOpen }: PhoneBuyBarProps) {
  return (
    <div
      data-phone-buy-bar
      className="fixed inset-x-0 bottom-0 z-10 box-border flex h-(--phone-buy-bar-height) items-center border-t bg-background px-6 md:hidden"
    >
      <OpenFieldsButton label={label} onOpen={onOpen} className="w-full" />
    </div>
  );
}
