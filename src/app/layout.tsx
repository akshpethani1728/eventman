import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventMan - Event Manpower Management",
  description: "Local event manpower management platform for Ahmedabad",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="gu" className="antialiased">
      <body>
        {children}
        <Toaster richColors position="top-center" />
        <div id="build-id" className="fixed bottom-2 left-2 z-50 text-[8px] text-gray-300 bg-white/80 px-1.5 py-0.5 rounded">v3</div>
      </body>
    </html>
  );
}
