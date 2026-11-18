import { PublicPageLayout } from "@/features/site-layout/page-frame/public-page-layout";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return <PublicPageLayout>{children}</PublicPageLayout>;
}
