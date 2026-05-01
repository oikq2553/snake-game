import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Snake Game",
  description: "Classic Snake Game built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
