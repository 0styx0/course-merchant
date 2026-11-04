// Stand-ins that each test file hands to `vi.mock` (the router and the description editor).
// The render helpers and sample values live in edit-course-form.fixtures.tsx.
import { vi } from "vitest";

export const push = vi.fn();
export const navigationMock = { useRouter: () => ({ push }) };

// Typing into Tiptap is unreliable in jsdom (the browser test covers it), so
// the editor is a plain stand-in.
export function MockDescriptionEditor() {
  return <div>Description editor</div>;
}
