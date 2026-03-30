
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { DynamicBackground } from '@/components/layout/dynamic-background';

export const metadata: Metadata = {
  title: 'Fluxion Sport | Gestión de Clubes Deportivos',
  description: 'Administra tu club, divisiones y equipos de forma profesional.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased text-foreground min-h-screen relative">
        <FirebaseClientProvider>
          {/* Fondo dinámico que reacciona al deporte del usuario */}
          <DynamicBackground />

          {/* Contenido principal con fondo transparente para dejar ver el fondo global */}
          <div className="relative z-0 min-h-screen bg-transparent">
            {children}
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
