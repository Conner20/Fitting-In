import Provider from "@/components/Provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fittingin.co";
const siteName = "Fitting In";
const description =
  "The fitness platform built to help you grow.";
const previewImage = `${siteUrl}/images/share_card.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description,
  openGraph: {
    title: siteName,
    description,
    url: siteUrl,
    siteName,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "Preview of the Fitting In",
      },
    ],
  },
  // twitter: {
  //   card: "summary_large_image",
  //   title: siteName,
  //   description,
  //   images: [previewImage],
  //   creator: "@fittingin",
  //   site: "@fittingin",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <Provider>
          {children}
          <Toaster />
        </Provider>
      </body>
    </html>
  );
}
