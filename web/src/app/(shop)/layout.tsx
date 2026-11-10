import { PublicPageLayout } from "@/features/site-layout/public-page-layout";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return <PublicPageLayout>{children}</PublicPageLayout>;
}
