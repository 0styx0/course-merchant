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

function addressProblem(href: string): string | undefined {
  if (!href) return "Enter an address";
  if (!isAllowedDescriptionLink(href)) return LINK_ADDRESS_MESSAGE;
  return undefined;
}

/** The typed address and its problem; a link under the cursor fills it in. */
function useLinkAddress(editor: Editor) {
  const [address, setAddress] = useState<string>(
    () => editor.getAttributes("link").href ?? "",
  );
  const [error, setError] = useState<string>();

  function changeAddress(value: string) {
    setAddress(value);
    setError(undefined);
  }

  /** The trimmed address, or undefined after showing what is wrong with it. */
  function validHrefOrShowError() {
    const href = address.trim();
    const problem = addressProblem(href);
    setError(problem);
    return problem ? undefined : href;
  }

  return { address, error, changeAddress, validHrefOrShowError };
}

/** Enter applies and Escape cancels; other keys are left alone. */
function applyOrCloseOnKey(
  event: React.KeyboardEvent,
  actions: { apply: () => void; close: () => void },
) {
  if (event.key === "Enter") {
    event.preventDefault();
    actions.apply();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    actions.close();
  }
}

function ApplyCancelButtons({
  onApply,
  onCancel,
}: {
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <Button type="button" onClick={onApply}>
        Apply
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </>
  );
}

function useFocusOnMount() {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  return inputRef;
}

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
  const inputRef = useFocusOnMount();
  const { address, error, changeAddress, validHrefOrShowError } =
    useLinkAddress(editor);

  function closeLinkField() {
    editor.commands.focus();
    onClose();
  }

  function applyLink() {
    const href = validHrefOrShowError();
    if (!href) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  }

  const handleLinkFieldKey = (event: React.KeyboardEvent) =>
    applyOrCloseOnKey(event, { apply: applyLink, close: closeLinkField });

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
          onChange={(event) => changeAddress(event.target.value)}
          onKeyDown={handleLinkFieldKey}
        />
        <ApplyCancelButtons onApply={applyLink} onCancel={closeLinkField} />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
