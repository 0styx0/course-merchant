import type { Metadata } from "next";

import { NotFoundMessage } from "@/components/not-found-message";
import { PublicPageLayout } from "@/features/site-layout/public-page-layout";

// The root layout's title template adds the site name.
export const metadata: Metadata = {
  title: "Page not found",
};

// The root not-found page renders outside the (shop) layout, so it brings the
// header and footer itself. It answers unknown URLs and every notFound() with
// no nearer not-found page, including the admin edit page for a missing course.
export default function UnknownUrlNotFound() {
  return (
    <PublicPageLayout>
      <NotFoundMessage
        title="Page not found"
        detail="This page doesn't exist. The link may have a typo, or the page has moved."
      />
    </PublicPageLayout>
  );
}
