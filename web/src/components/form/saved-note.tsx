import { StickyFormNotice } from "@/components/form/sticky-form-notice";

/** The sticky box at the top of a form that says the course was saved; nothing without a note. */
export function SavedNote({ note }: { note?: string }) {
  if (note === undefined) return null;
  return (
    <StickyFormNotice role="status" className="border-success">
      {note}
    </StickyFormNotice>
  );
}
