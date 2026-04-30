import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Roboto_Mono } from "next/font/google";
import type { Metadata } from "next";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "IskoLab | Fablab UP Cebu",
  description: "Make almost Everying!",
  icons: {
    icon: "/fablab.svg",
  },
};

export default async function RootLayout({
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
