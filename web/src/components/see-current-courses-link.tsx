import { GhostArrowLink } from "@/components/ghost-arrow-link";

export function SeeCurrentCoursesLink({ className }: { className?: string }) {
  return (
    <GhostArrowLink href="/" className={className}>
      See current courses →
    </GhostArrowLink>
  );
}
