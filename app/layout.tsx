import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tagesschau AI – Tägliche Zusammenfassungen",
  description:
    "Automatische KI-Zusammenfassungen der Tagesschau 20 Uhr, täglich aktualisiert. Verfolge die wichtigsten Nachrichten des Tages auf einen Blick.",
  openGraph: {
    title: "Tagesschau AI",
    description: "Tägliche KI-Zusammenfassungen der Tagesschau 20 Uhr",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
