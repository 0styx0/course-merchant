import { getSchema, type JSONContent } from "@tiptap/core";
import { z } from "zod";

import { FieldErrorCode } from "@/common/errors/error-codes.js";
import { descriptionExtensions } from "./description-extensions.js";

const MAX_TEXT_LENGTH = 5000;
const MAX_LINK_LENGTH = 2048;
const ALLOWED_LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

// The editor's own rules (node and mark types, what may nest in what)
const editorSchema = getSchema(descriptionExtensions);

type Path = (string | number)[];

type Problem = {
  path: Path;
  message: string;
  code: FieldErrorCode;
};

// Postgres jsonb refuses U+0000 and unpaired surrogates, which would be a 500.
// With the u flag, \p{Cs} only matches a surrogate that isn't half of a pair.
function isStorableText(text: string) {
  return !/[\0\p{Cs}]/u.test(text);
}

function isAllowedLink(href: string) {
  if (href.length > MAX_LINK_LENGTH || !isStorableText(href)) {
    return false;
  }

  try {
    // Also catches "JAVASCRIPT:", leading spaces and "java\tscript:"
    return ALLOWED_LINK_PROTOCOLS.has(new URL(href).protocol);
  } catch {
    return false;
  }
}

type TextNode = { node: JSONContent; path: Path };

function* textNodes(node: JSONContent, path: Path): Generator<TextNode> {
  if (node.type === "text") {
    yield { node, path };
  }

  for (const [index, child] of (node.content ?? []).entries()) {
    yield* textNodes(child, [...path, "content", index]);
  }
}

type Mark = NonNullable<JSONContent["marks"]>[number];

function badTextProblems({ node, path }: TextNode): Problem[] {
  if (isStorableText(node.text ?? "")) {
    return [];
  }

  return [
    {
      path: [...path, "text"],
      message: "Text must not contain null or malformed characters.",
      code: FieldErrorCode.INVALID_VALUE,
    },
  ];
}

function isDisallowedLink(mark: Mark): boolean {
  const href: unknown = mark.attrs?.href;

  return (
    mark.type === "link" && !(typeof href === "string" && isAllowedLink(href))
  );
}

function linkProblem(mark: Mark, index: number, path: Path): Problem[] {
  if (!isDisallowedLink(mark)) {
    return [];
  }

  return [
    {
      path: [...path, "marks", index, "attrs", "href"],
      message:
        "Links must start with https://, http://, mailto: or tel: and be at most 2048 characters.",
      code: FieldErrorCode.INVALID_VALUE,
    },
  ];
}

function badLinkProblems({ node, path }: TextNode): Problem[] {
  return (node.marks ?? []).flatMap((mark, index) =>
    linkProblem(mark, index, path),
  );
}

function totalLengthProblems(nodes: TextNode[]): Problem[] {
  const allText = nodes.map(({ node }) => node.text ?? "").join("");

  if (!/\S/u.test(allText)) {
    return [
      {
        path: [],
        message: "Description must contain some text.",
        code: FieldErrorCode.TOO_SHORT,
      },
    ];
  }

  if (allText.length <= MAX_TEXT_LENGTH) {
    return [];
  }

  return [
    {
      path: [],
      message: `Description text must be at most ${MAX_TEXT_LENGTH} characters.`,
      code: FieldErrorCode.TOO_LONG,
    },
  ];
}

function findProblems(doc: JSONContent): Problem[] {
  const nodes = [...textNodes(doc, [])];

  return [
    ...nodes.flatMap(badTextProblems),
    ...nodes.flatMap(badLinkProblems),
    ...totalLengthProblems(nodes),
  ];
}

const NOT_A_DOCUMENT: Problem = {
  path: [],
  message: "Description is not a valid document.",
  code: FieldErrorCode.INVALID_VALUE,
};

// Loads the document through the editor's schema. The result is that schema's
// own JSON, so attributes the editor doesn't know are dropped, not stored.
function normalize(value: JSONContent): JSONContent | undefined {
  try {
    const node = editorSchema.nodeFromJSON(value);
    node.check();
    return node.toJSON() as JSONContent;
  } catch {
    return undefined;
  }
}

export const descriptionDocumentSchema = z
  .looseObject({
    type: z.literal("doc"),
    content: z.array(z.looseObject({ type: z.string() })).min(1),
  })
  .transform((value, ctx): JSONContent => {
    const doc = normalize(value);
    const problems = doc ? findProblems(doc) : [NOT_A_DOCUMENT];

    for (const problem of problems) {
      ctx.issues.push({
        code: "custom",
        input: value,
        path: problem.path,
        message: problem.message,
        params: { validationCode: problem.code },
      });
    }

    return doc ?? z.never();
  });
