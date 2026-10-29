import { getSchema, type JSONContent } from "@tiptap/core";

import type { CourseDescriptionDocument } from "@/lib/types";

import { descriptionExtensions } from "./description-extensions";

const descriptionSchema = getSchema(descriptionExtensions);

/**
 * Drops the empty paragraphs that Google Docs and the editor's trailing line
 * leave, and copies the rest into plain objects: the editor's attribute
 * objects have no prototype, which a Server Action can't receive. Other
 * attributes the editor adds (such as a link's `rel`) are sent as they are;
 * the API keeps only the ones it knows.
 */
export function toCourseDescription(
  editorJson: JSONContent,
): CourseDescriptionDocument {
  const blocks = (editorJson.content ?? []).filter(
    (block) => !isEmptyParagraph(block),
  );

  return {
    type: "doc",
    content: blocks.map((block) => ({
      ...structuredClone(block),
      type: block.type ?? "",
    })),
  };
}

/**
 * The editor's character count (Tiptap's `CharacterCount` extension in its
 * default mode, which reads the text the same way and counts a line break or a
 * rule as one space), so the counter shown and the form's check always agree.
 * The API counts only the text, so it never refuses what this accepts.
 */
export function countDescriptionCharacters(node: JSONContent): number {
  const doc = descriptionSchema.nodeFromJSON(node);
  return doc.textBetween(0, doc.content.size, undefined, " ").length;
}

/** False for spaces, non-breaking spaces or line breaks only, like the API. */
export function hasVisibleText(node: JSONContent): boolean {
  return /\S/u.test(collectText(node));
}

function isEmptyParagraph(node: JSONContent): boolean {
  return node.type === "paragraph" && !node.content?.length;
}

function collectText(node: JSONContent): string {
  return (node.text ?? "") + (node.content ?? []).map(collectText).join("");
}
