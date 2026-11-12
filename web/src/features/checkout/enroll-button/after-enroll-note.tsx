type AfterEnrollNoteProps = {
  isPaid: boolean;
};

const PAID_NOTE =
  "You pay on Stripe's secure page. Then we email you a link to the course material. You don't need an account.";
const FREE_NOTE =
  "We email you a link to the course material. You don't need an account.";

/** Tells the visitor what happens once they enroll; shown beside the enroll button and fields. */
export function AfterEnrollNote({ isPaid }: AfterEnrollNoteProps) {
  return (
    <p className="mt-4 text-sm text-muted-foreground">
      {isPaid ? PAID_NOTE : FREE_NOTE}
    </p>
  );
}
