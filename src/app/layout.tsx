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
  // Imagen profesional de hockey
  const hockeyBgUrl = "https://images.unsplash.com/photo-1515523110800-9415d13b84a8?q=80&w=1974&auto=format&fit=crop";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased text-foreground min-h-screen relative bg-background/95">
        <FirebaseClientProvider>
          {/* Capa de fondo fija detras de todo */}
          <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat grayscale-[20%]"
              style={{ 
                backgroundImage: `url(${hockeyBgUrl})`,
                opacity: 0.5 
              }}
              data-ai-hint="field hockey"
            />
            {/* Velo de color para que el contenido sea legible */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
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
