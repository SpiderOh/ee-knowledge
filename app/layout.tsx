import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "研电 · EE Knowledge",
  description: "电子信息专业知识库与个人学习系统",
  applicationName: "研电 · EE Knowledge",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "研电",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/ee-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/ee-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icons/ee-192.png", sizes: "192x192", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101827",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
