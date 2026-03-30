import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';

export const metadata: Metadata = {
  title: 'Fluxion Sport | Gestión de Clubes Deportivos',
  description: 'Administra tu club, divisiones y equipos de forma profesional.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ruta a la imagen solicitada en la carpeta public
  const hockeyBgUrl = "/hockey.jpg";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased text-foreground min-h-screen relative">
        <FirebaseClientProvider>
          {/* Capa de fondo fija detras de todo */}
          <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-slate-950">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url(${hockeyBgUrl})`,
                opacity: 0.5 
              }}
              data-ai-hint="field hockey"
            />
            {/* Velo de color negro semi-transparente para legibilidad extrema */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />
          </div>

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
