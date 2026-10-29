import type { Course } from "@/lib/types";
import { dateTimeFormatter } from "@/lib/utils/formatters";

type CourseScheduleProps = {
  schedule: Course["schedule"];
};

/** Start and end times in the course's own time zone, and the zone's name. */
export function CourseSchedule({ schedule }: CourseScheduleProps) {
  const dateFormatter = dateTimeFormatter(schedule.timeZone);

  return (
    <div>
      <p>
        <time dateTime={schedule.startTime}>
          {dateFormatter.format(new Date(schedule.startTime))}
        </time>
        {" – "}
        <time dateTime={schedule.endTime}>
          {dateFormatter.format(new Date(schedule.endTime))}
        </time>
      </p>
      <p className="mt-1 text-sm text-gray-600">{schedule.timeZone}</p>
    </div>
  );
}
