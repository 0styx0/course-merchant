import { Injectable } from "@nestjs/common";

import type { DbScope } from "types.js";
import type { EmailViews } from "../templates/email-templates.js";

type CourseView = EmailViews["access_granted"]["course"];

/**
 * Reads what the email templates show, by the ids in an outbox payload. It
 * returns null when the row no longer exists.
 */
@Injectable()
export class EmailViewsRepository {
  async findCourse(
    scope: DbScope,
    courseId: string,
  ): Promise<CourseView | null> {
    return scope.orm.public.Course.select(
      "title",
      "contentUrl",
      "startsAt",
      "endsAt",
      "timeZone",
    )
      .where((course) => course.id.eq(courseId))
      .first();
  }
}
