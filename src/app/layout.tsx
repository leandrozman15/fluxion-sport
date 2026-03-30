
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
  // URL de la imagen de fondo profesional de hockey
  const hockeyBgUrl = "https://images.unsplash.com/photo-1515523110800-9415d13b84a8?q=80&w=1974&auto=format&fit=crop";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground relative">
        <FirebaseClientProvider>
          {/* Capa de fondo con transparencia */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 grayscale-[30%]"
              style={{ backgroundImage: `url(${hockeyBgUrl})` }}
              data-ai-hint="field hockey"
            />
            {/* Overlay para suavizar el contraste con el contenido */}
            <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
          </div>

          <div className="relative z-0">
            {children}
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
