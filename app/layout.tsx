import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Semillero Quiz",
  description: "Juegos de preguntas para las clases de Semillero Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
