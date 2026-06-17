import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { Suspense } from "react";
import { GuidedTour } from "./components/guided-tour";
import { ToastHost } from "./components/toast-host";
import { getInitialTheme } from "@/lib/theme-state";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Reservas de Ambientes",
  description: "Gestao de reservas de ambientes academicos",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getInitialTheme();

  return (
    <html lang="pt-BR" data-theme={theme}>
      <body className={ibmPlexSans.variable}>
        {children}
        <Suspense fallback={null}>
          <ToastHost />
        </Suspense>
        <GuidedTour />
      </body>
    </html>
  );
}
