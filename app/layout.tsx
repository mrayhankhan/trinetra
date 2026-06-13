import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRINETRA — Crime Intelligence Console",
  description:
    "Agentic crime-intelligence platform for the Karnataka State Police. Ask in Kannada or English; uncover hidden criminal networks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden font-sans">{children}</body>
    </html>
  );
}
