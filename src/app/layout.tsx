import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "IskoLab | Fablab UP Cebu",
  description: "Make almost Everything!",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/fablab.svg" },
      { url: "/ios/16.png", sizes: "16x16", type: "image/png" },
      { url: "/ios/32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/ios/57.png", sizes: "57x57", type: "image/png" },
      { url: "/ios/60.png", sizes: "60x60", type: "image/png" },
      { url: "/ios/72.png", sizes: "72x72", type: "image/png" },
      { url: "/ios/76.png", sizes: "76x76", type: "image/png" },
      { url: "/ios/114.png", sizes: "114x114", type: "image/png" },
      { url: "/ios/120.png", sizes: "120x120", type: "image/png" },
      { url: "/ios/144.png", sizes: "144x144", type: "image/png" },
      { url: "/ios/152.png", sizes: "152x152", type: "image/png" },
      { url: "/ios/167.png", sizes: "167x167", type: "image/png" },
      { url: "/ios/180.png", sizes: "180x180", type: "image/png" },
      { url: "/ios/1024.png", sizes: "1024x1024", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const token = await getToken();
  return (
    <html lang="en" className={`${robotoMono.variable} h-full`}>
      <body className="font-mono antialiased h-full">
        <ConvexClientProvider initialToken={token}>
          {children}
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
