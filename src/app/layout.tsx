import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Речник - Српски речник",
    template: "%s | Речник",
  },
  description:
    "Свеобухватни онлајн речник српског језика са дефиницијама, изговором, синонимима, падежима и граматичким информацијама.",
  keywords: [
    "српски речник",
    "serbian dictionary",
    "rečnik",
    "definicije",
    "значење речи",
    "sinonimi",
    "padeži",
  ],
  authors: [{ name: "Речник" }],
  openGraph: {
    type: "website",
    locale: "sr_RS",
    siteName: "Речник",
    title: "Речник - Српски речник",
    description: "Свеобухватни онлајн речник српског језика",
  },
  twitter: {
    card: "summary_large_image",
    title: "Речник - Српски речник",
    description: "Свеобухватни онлајн речник српског језика",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
