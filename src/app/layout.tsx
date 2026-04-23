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
