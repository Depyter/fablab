import type { Metadata } from "next";
import { Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "IskoLab | Fablab UP Cebu",
  description: "Build something great!",
  icons: {
    icon: "/fablab.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${robotoMono.variable} h-full`}>
      <body className="font-mono antialiased h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
