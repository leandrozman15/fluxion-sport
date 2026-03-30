
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
  // Referencia a la imagen local en la carpeta public
  const hockeyBgUrl = "/hockey.jpg";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased text-foreground min-h-screen relative bg-transparent">
        <FirebaseClientProvider>
          {/* Capa de fondo fija detras de todo */}
          <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url(${hockeyBgUrl})`,
                opacity: 0.5 
              }}
              data-ai-hint="field hockey"
            />
            {/* Velo de color temático para que el contenido sea perfectamente legible */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
          </div>

          {/* Contenido principal */}
          <div className="relative z-0 min-h-screen">
            {children}
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
