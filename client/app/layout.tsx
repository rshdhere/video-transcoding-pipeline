import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google"
import { TRPCProviders } from "../providers/trpc-provider"

export const metadata: Metadata = {
  title: "Video Transcoding Pipeline",
  description: "upload your videos to get multiple variations of it",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]

})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TRPCProviders>
          <main>
            {children}
          </main>
        </TRPCProviders>
      </body>
    </html>
  );
}
