import Link from "next/link";

import { shopCoursePath } from "@/features/courses/shop-course-path";

import type { EditCourseFormValues } from "../../validation/edit-course-form-schema";
import { courseStatusLabels } from "../edit-course-fields";

type CourseStatusName = EditCourseFormValues["status"];

type EditPageHeaderProps = {
  courseId: string;
  name: string;
  statusName: CourseStatusName;
  isInShop: boolean;
};

/** The shop lists a published course that has at least one price in effect. */
export function isShownInShop(
  statusName: CourseStatusName,
  pricesInEffectCount: number,
): boolean {
  return statusName === "published" && pricesInEffectCount > 0;
}

function ShopLinkOrNote({
  courseId,
  isInShop,
}: Pick<EditPageHeaderProps, "courseId" | "isInShop">) {
  if (!isInShop) {
    return <span>Not in the shop</span>;
  }
  return (
    <Link className="underline" href={shopCoursePath(courseId)}>
      View in the shop
    </Link>
  );
}

/** The saved course's name, its status and where the shop shows it. */
export function EditPageHeader({
  courseId,
  name,
  statusName,
  isInShop,
}: EditPageHeaderProps) {
  return (
    <header className="mb-8">
      <p className="text-xl font-semibold">{name}</p>
      <p className="mt-1 flex gap-4 text-muted-foreground">
        <span>{courseStatusLabels[statusName]}</span>
        <ShopLinkOrNote courseId={courseId} isInShop={isInShop} />
      </p>
    </header>
  );
}
