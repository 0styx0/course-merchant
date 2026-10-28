"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  isAllowedDescriptionLink,
  LINK_ADDRESS_MESSAGE,
} from "./description-link";

type DescriptionLinkFieldProps = {
  editor: Editor;
  id: string;
  onClose: () => void;
};

/**
 * The address box under the toolbar. It is not a <form>, because it sits
 * inside the course form and forms can't nest: Enter applies, Escape cancels.
 * On a link it starts with that link's address and changes the whole link.
 */
export function DescriptionLinkField({
  editor,
  id,
  onClose,
}: DescriptionLinkFieldProps) {
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState<string>(
    () => editor.getAttributes("link").href ?? "",
  );
  const [error, setError] = useState<string>();

  useEffect(() => inputRef.current?.focus(), []);

  function close() {
    editor.commands.focus();
    onClose();
  }

  function apply() {
    const href = address.trim();
    if (!href) {
      setError("Enter an address");
      return;
    }
    if (!isAllowedDescriptionLink(href)) {
      setError(LINK_ADDRESS_MESSAGE);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  }

  return (
    <div id={id} className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Input
          ref={inputRef}
          aria-label="Link address"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1"
          value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            setError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
        />
        <Button type="button" onClick={apply}>
          Apply
        </Button>
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
