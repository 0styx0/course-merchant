import { cn } from "cn";

type CharacterCountProps = {
  count: number;
  limit: number;
};

/**
 * "12 / 100" for a field with a length limit; red once over it. Typing is never
 * blocked: the form shows the error. It is plain text, not a live region, so it
 * isn't read out on every keystroke.
 */
export function CharacterCount({ count, limit }: CharacterCountProps) {
  return (
    <span className={cn(count > limit && "text-destructive")}>
      {count.toLocaleString("en-US")} / {limit.toLocaleString("en-US")}
    </span>
  );
}
