import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "ParkAndTran",
  description: "Parking enforcement records and analytics"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
