import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { OfflineBanner, InstallPrompt, PWARegistration } from "@/components/PWA";
import "./globals.css";

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
  themeColor: "#2563eb",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="gu" className="antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-[#f5f5f7] min-h-screen safe-area-padding">
        {children}
        <Toaster richColors position="top-center" />
        <PWARegistration />
        <OfflineBanner />
        <InstallPrompt />
        <div id="build-id" className="fixed bottom-2 left-2 z-50 text-[8px] text-gray-300 bg-white/80 px-1.5 py-0.5 rounded">v3</div>
      </body>
    </html>
  );
}
