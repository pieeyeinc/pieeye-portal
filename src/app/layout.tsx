import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from '@/components/ui/sonner'
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PieEye Portal - Privacy Compliance Platform",
  description: "Self-serve onboarding portal for PieEye's privacy compliance platform",
  keywords: "privacy, compliance, GDPR, consent management, data protection",
  authors: [{ name: "PieEye" }],
  openGraph: {
    title: "PieEye Portal - Privacy Compliance Platform",
    description: "Self-serve onboarding portal for PieEye's privacy compliance platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}