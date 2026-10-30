import { Button } from "@/components/ui/button";

/** The form's submit button; it reads "Saving…" while the save runs. */
export function SaveButton({
  label,
  isSubmitting,
}: {
  label: string;
  isSubmitting: boolean;
}) {
  return (
    <Button type="submit" disabled={isSubmitting} className="self-start">
      {isSubmitting ? "Saving…" : label}
    </Button>
  );
}
