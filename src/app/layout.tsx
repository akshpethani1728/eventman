import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { OfflineBanner, InstallPrompt, PWARegistration } from "@/components/PWA";
import { SessionKeeper } from "@/components/SessionKeeper";
import { NotificationGate, NotificationTest } from "@/components/NotificationPermission";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EventMan - Event Manpower Management",
  description: "Local event manpower management platform for Ahmedabad",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EventMan",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e293b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="gu" className={`${inter.variable} antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen safe-area-padding" style={{ backgroundColor: "#F8F8F6" }}>
        <SessionKeeper />
        {children}
        <Toaster richColors position="top-center" />
        <PWARegistration />
        <OfflineBanner />
        <InstallPrompt />
        <NotificationGate />
        <NotificationTest />
        <div id="build-id" className="fixed bottom-2 left-2 z-50 text-[8px] text-gray-300 bg-white/80 px-1.5 py-0.5 rounded">v3</div>
      </body>
    </html>
  );
}
