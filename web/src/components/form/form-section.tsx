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

/** A titled group of fields: a named `<fieldset>` for screen readers. */
export function FormSection({
  title,
  description,
  help,
  children,
  className = "flex flex-col gap-4",
}: FormSectionProps) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-lg font-semibold">{title}</legend>
      <p className="text-sm text-muted-foreground">
        {description}
        {help && <span className="block">{help}</span>}
      </p>
      <div className={className}>{children}</div>
    </fieldset>
  );
}
