import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Week — Routine Planner",
  description: "Personal weekly routine planner",
  manifest: "/manifest.json",
  icons: {
    icon: "/android-chrome-192x192.png",
    apple: "/android-chrome-512x512.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "My Week",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#192238",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#141824] text-white selection:bg-[#8A7CFF] selection:text-white">
        {children}
      </body>
    </html>
  );
}