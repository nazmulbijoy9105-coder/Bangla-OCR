import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  variable: "--font-noto-bengali",
});

export const metadata: Metadata = {
  title: "Bangla OCR - Extract Text from Bengali Images",
  description: "Fast and accurate Bangla OCR tool to extract text from Bengali images. Convert scanned documents, photos, and screenshots to editable text.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${notoSansBengali.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}