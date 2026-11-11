import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { descriptionExtensions } from "../../course-description/description-extensions";

const renderChildrenOnly = ({ children }: { children?: ReactNode }) => (
  <>{children}</>
);

type CourseDescriptionProps = {
  description: JSONContent;
};

export function CourseDescription({ description }: CourseDescriptionProps) {
  // The admin editor shares `description-content` but sets no size or colour,
  // so the admin types in full-contrast 16px text; only this page mutes it.
  return (
    <div className="description-content text-body-lg text-muted-foreground">
      {renderToReactElement({
        content: description,
        extensions: descriptionExtensions,
        // A type the editor doesn't know shows its text instead of throwing
        options: {
          unhandledNode: renderChildrenOnly,
          unhandledMark: renderChildrenOnly,
        },
      })}
    </div>
  );
}
