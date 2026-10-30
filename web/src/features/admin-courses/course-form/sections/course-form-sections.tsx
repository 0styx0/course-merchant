"use client";

import type { ReactNode } from "react";

import { FormSection } from "@/components/form/form-section";
import { Button } from "@/components/ui/button";

import type { priceSummary } from "../../price/price-summary";
import { PriceSchedule } from "../../price/price-schedule";

/** The frame for the course image, name, summary and description. */
export function BasicsSection({ children }: { children: ReactNode }) {
  return (
    <FormSection
      title="Basics"
      description="What students see when they browse for the course."
    >
      {children}
    </FormSection>
  );
}

/** The frame for the link to the course material. */
export function CourseMaterialSection({ children }: { children: ReactNode }) {
  return (
    <FormSection
      title="Course material"
      description="The material students get after they buy."
    >
      {children}
    </FormSection>
  );
}

/** The schedule's frame: its problem line, the given boxes, and the summary line. */
export function ScheduleSection({
  children,
  scheduleText,
}: {
  children: ReactNode;
  scheduleText: string | undefined;
}) {
  return (
    <FormSection
      title="Schedule"
      description="When the course runs."
      className="grid gap-4 sm:grid-cols-2"
    >
      {children}
      <p aria-live="polite" className="text-sm sm:col-span-2">
        {scheduleText}
      </p>
    </FormSection>
  );
}

/** The pricing frame: the given rows, the button to add one, and the summary of them. */
export function PricingSection({
  children,
  onAddPrice,
  summary,
}: {
  children: ReactNode;
  onAddPrice: () => void;
  summary: ReturnType<typeof priceSummary>;
}) {
  return (
    <FormSection
      title="Pricing"
      description="What students pay, in US dollars, and when each price starts. Enter 0 for a free course."
      help="Leave the date and time empty to start when the course is published."
    >
      {children}
      <Button
        type="button"
        variant="outline"
        onClick={onAddPrice}
        className="self-start"
      >
        Add price
      </Button>
      <PriceSchedule summary={summary} />
    </FormSection>
  );
}
