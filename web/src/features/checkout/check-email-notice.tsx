import { CircleCheck } from "lucide-react";
import type { Ref } from "react";

type CheckEmailNoticeProps = {
  /** The address the access went to. */
  email: string;
  /** Lets the parent move focus to the notice once it appears. */
  ref?: Ref<HTMLDivElement>;
};

/** The green box that tells a visitor the course link is on its way. */
export function CheckEmailNotice({ email, ref }: CheckEmailNoticeProps) {
  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="flex gap-3 rounded-lg border border-success p-4 text-success outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-medium">Check your email</p>
        <p className="mt-1 text-muted-foreground">
          {`We've sent access to ${email}. It can take a few minutes. If it hasn't arrived, look in spam.`}
        </p>
      </div>
    </div>
  );
}
