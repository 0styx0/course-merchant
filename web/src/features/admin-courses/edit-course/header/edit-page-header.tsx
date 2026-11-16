import Link from "next/link";

import { shopCoursePath } from "@/features/courses/shop-course-path";

import { adminCourseViewPath } from "../../addresses/admin-course-path";
import { courseStatusLabels } from "../../course-status/course-status-labels";
import type { EditCourseFormValues } from "../../validation/edit-course-form-schema";

type CourseStatusName = EditCourseFormValues["status"];

type EditPageHeaderProps = {
  courseId: string;
  name: string;
  statusName: CourseStatusName;
  isInShop: boolean;
};

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

/** The saved course's name, its status, where the shop shows it and a link to its admin page. */
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
        <Link className="underline" href={adminCourseViewPath(courseId)}>
          View course
        </Link>
      </p>
    </header>
  );
}
