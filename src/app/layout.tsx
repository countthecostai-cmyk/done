import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://done.app";
const title = "Done — There's a Doer for that";
const description =
  "Done is a local on-demand task marketplace. Request labor, errands, or on-demand personal tasks and get matched with a Doer nearby.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Done",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
