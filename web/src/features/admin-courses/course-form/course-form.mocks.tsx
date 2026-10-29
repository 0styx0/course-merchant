import type { JSONContent } from "@tiptap/core";
import { vi } from "vitest";

export const push = vi.fn();
export const navigationMock = { useRouter: () => ({ push }) };

// Typing into Tiptap is unreliable in jsdom (the browser test covers it), so
// the editor is a button that fills in a description.
export function MockDescriptionEditor({
  onChange,
  fieldRef,
  error,
}: {
  onChange: (description: JSONContent) => void;
  fieldRef: (handle: { focus: () => void } | null) => void;
  error?: string;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange({
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
            ],
          })
        }
        ref={(element) => fieldRef(element && { focus: () => element.focus() })}
      >
        Fill description
      </button>
      {error && <p>Description problem: {error}</p>}
    </div>
  );
}
