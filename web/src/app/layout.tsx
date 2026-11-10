import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/site-config/site-name";
import { cn } from "@/lib/utils/cn";

const dmSans = DM_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "sans-serif",
  ],
});

const playfairDisplay = Playfair_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-playfair",
  fallback: ["Iowan Old Style", "Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: {
    template: `%s · ${SITE_NAME}`,
    default: SITE_NAME,
  },
  description:
    "A storefront for selling online courses, with payment through Stripe Checkout.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        dmSans.variable,
        playfairDisplay.variable,
      )}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
