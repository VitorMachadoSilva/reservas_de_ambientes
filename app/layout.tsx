import type { Metadata } from "next";
import { Suspense } from "react";
import { ToastHost } from "./components/toast-host";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reservas de Ambientes",
  description: "Gestao de reservas de ambientes academicos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Suspense fallback={null}>
          <ToastHost />
        </Suspense>
      </body>
    </html>
  );
}
