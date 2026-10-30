import type { ReactNode } from "react";

type FormSectionProps = {
  title: string;
  /** One line saying what the section is for. */
  description: string;
  /** Extra help shown under the description, for the whole section. */
  help?: string;
  children: ReactNode;
  /** Classes for the box that holds the fields. */
  className?: string;
};

/**
 * A titled group of fields drawn as a card: a named `<fieldset>` for screen readers.
 * A border on a fieldset would draw the legend on its edge, so the legend floats
 * full width to sit inside the padding; the next element clears the float.
 */
export function FormSection({
  title,
  description,
  help,
  children,
  className = "flex flex-col gap-4",
}: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-5 sm:p-6">
      <legend className="float-left w-full text-lg font-semibold">
        {title}
      </legend>
      <p className="clear-both text-sm text-muted-foreground">
        {description}
        {help && <span className="block">{help}</span>}
      </p>
      <div className={className}>{children}</div>
    </fieldset>
  );
}
