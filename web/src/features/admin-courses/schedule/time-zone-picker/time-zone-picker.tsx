"use client";

import type { Ref } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import { matchesTimeZoneQuery } from "./matches-time-zone-query";

type TimeZonePickerProps = {
  timeZones: string[];
  value: string;
  onChange: (timeZone: string) => void;
  onBlur: () => void;
  inputRef?: Ref<HTMLInputElement>;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * A searchable list of time zones. Typing only narrows the list; the value
 * changes when the admin picks a zone, so it is always one from `timeZones`.
 */
export function TimeZonePicker({
  timeZones,
  value,
  onChange,
  onBlur,
  inputRef,
  ...inputProps
}: TimeZonePickerProps) {
  return (
    <Combobox
      items={timeZones}
      value={value}
      filter={matchesTimeZoneQuery}
      onValueChange={(timeZone) => timeZone && onChange(timeZone)}
    >
      <ComboboxInput
        ref={inputRef}
        onBlur={onBlur}
        className="w-full"
        {...inputProps}
      />
      <ComboboxContent>
        <ComboboxEmpty>No time zone found</ComboboxEmpty>
        <ComboboxList>
          {(timeZone: string) => (
            <ComboboxItem key={timeZone} value={timeZone}>
              {timeZone}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
