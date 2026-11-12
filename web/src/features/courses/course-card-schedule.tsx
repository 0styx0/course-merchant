import type { Course } from "@/lib/types";
import { dateTimeFormatter } from "@/lib/utils/formatters";

type CourseCardScheduleProps = {
  schedule: Course["schedule"];
};

/** Start and end times in the course's own time zone, and the zone's name. */
export function CourseCardSchedule({ schedule }: CourseCardScheduleProps) {
  const scheduleTimeFormatter = dateTimeFormatter(schedule.timeZone);

  return (
    <div>
      <p>
        <time dateTime={schedule.startTime}>
          {scheduleTimeFormatter.format(new Date(schedule.startTime))}
        </time>
        {" – "}
        <time dateTime={schedule.endTime}>
          {scheduleTimeFormatter.format(new Date(schedule.endTime))}
        </time>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{schedule.timeZone}</p>
    </div>
  );
}
