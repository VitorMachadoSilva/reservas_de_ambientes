import type { Metadata } from "next";
import { Suspense } from "react";
import { GuidedTour } from "./components/guided-tour";
import { ToastHost } from "./components/toast-host";
import { getInitialTheme } from "@/lib/theme-state";
import "./globals.css";

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
      <body>
        {children}
        <Suspense fallback={null}>
          <ToastHost />
        </Suspense>
        <GuidedTour />
      </body>
    </html>
  );
}
