import { useEffect, useRef } from "react";
import { CheckEmailNotice } from "./check-email-notice";

export function FocusedCheckEmailNotice({ email }: { email: string }) {
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    noticeRef.current?.focus();
  }, []);

  return (
    <div className="mt-6">
      <CheckEmailNotice ref={noticeRef} email={email} />
    </div>
  );
}
