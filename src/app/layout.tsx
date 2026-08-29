import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Done — There's a Doer for that",
  description:
    "Done is a local on-demand task marketplace. Request labor, errands, or on-demand personal tasks and get matched with a Doer nearby.",
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
