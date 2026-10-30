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
  return (
    <div className="description-content">
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
