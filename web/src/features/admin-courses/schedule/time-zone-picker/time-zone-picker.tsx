"use client";

import { useState, type KeyboardEvent, type Ref } from "react";

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

const IME_COMPOSITION_KEY_CODE = 229;

type TimeZoneKeyEvent = KeyboardEvent<HTMLInputElement> & {
  preventBaseUIHandler: () => void;
};

// Base UI lets a bare Enter through to the form, which would save the course.
// An Enter that confirms an input-method composition (key code 229, as Base UI
// checks it) stays with the browser.
function stopEnterFromSubmittingForm(event: TimeZoneKeyEvent) {
  if (event.key === "Enter" && event.which !== IME_COMPOSITION_KEY_CODE) {
    event.preventDefault();
  }
}

function useTimeZoneListOpenStateAndKeys() {
  const [isListOpen, setIsListOpen] = useState(false);

  // Base UI empties the box on Escape with the list closed; keep the zone.
  function keepChosenZoneOnEscapeWithListClosed(event: TimeZoneKeyEvent) {
    if (event.key === "Escape" && !isListOpen) event.preventBaseUIHandler();
  }

  function protectChosenZoneOnKeyDown(event: TimeZoneKeyEvent) {
    stopEnterFromSubmittingForm(event);
    keepChosenZoneOnEscapeWithListClosed(event);
  }

  return { isListOpen, setIsListOpen, protectChosenZoneOnKeyDown };
}

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
  const { isListOpen, setIsListOpen, protectChosenZoneOnKeyDown } =
    useTimeZoneListOpenStateAndKeys();

  return (
    <Combobox
      // Marks the first matching zone as the admin types, so Enter picks it.
      autoHighlight
      open={isListOpen}
      onOpenChange={setIsListOpen}
      items={timeZones}
      value={value}
      filter={matchesTimeZoneQuery}
      onValueChange={(timeZone) => timeZone && onChange(timeZone)}
    >
      <ComboboxInput
        ref={inputRef}
        onBlur={onBlur}
        onKeyDown={protectChosenZoneOnKeyDown}
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
