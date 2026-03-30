
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2,
  Loader2,
  Sparkles,
  Zap,
  ShieldCheck,
  Users,
  Trophy,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function DashboardPage() {
  const { firestore, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    async function checkIdentity() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);
          
          // Redirección inteligente si ya pertenece a un club
          if (data.role === 'coach') router.replace('/dashboard/coach');
          else if (data.role === 'player') router.replace('/dashboard/player');
          else if (data.clubId) router.replace(`/dashboard/clubs/${data.clubId}`);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (!isUserLoading) checkIdentity();
  }, [user, isUserLoading, firestore, router]);

  if (isUserLoading || loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;

  return (
    <div className="space-y-10 max-w-7xl mx-auto py-2 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-md flex items-center gap-3">
            Fluxion Sport <Sparkles className="h-6 w-6 text-accent" />
          </h1>
          <p className="text-white/80 font-bold text-lg">Consola de Gestión de Clubes.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-white/95 border-none shadow-2xl overflow-hidden group">
          <CardHeader className="bg-primary text-primary-foreground p-8">
            <Building2 className="h-12 w-12 mb-4" />
            <CardTitle className="text-3xl font-black">Mi Institución</CardTitle>
            <CardDescription className="text-primary-foreground/80 font-medium">Gestiona tu club, categorías y finanzas desde un solo lugar.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-slate-600 mb-6 font-medium">Si ya eres administrador de un club, haz clic abajo para entrar a tu panel oficial.</p>
            <Button asChild className="w-full h-14 font-black uppercase text-xs tracking-widest shadow-xl">
              <Link href="/dashboard/clubs">Ver Listado de Clubes <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-none shadow-2xl overflow-hidden group">
          <CardHeader className="bg-slate-900 text-white p-8">
            <ShieldCheck className="h-12 w-12 mb-4 text-accent" />
            <CardTitle className="text-3xl font-black">Acceso Técnico</CardTitle>
            <CardDescription className="text-white/60 font-medium">Entrenadores y Coordinadores Deportivos.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-slate-600 mb-6 font-medium">Accede a la pizarra táctica, toma asistencia y gestiona tus plantillas de juego.</p>
            <div className="grid grid-cols-2 gap-4">
              <Button asChild variant="outline" className="h-12 font-bold border-2 border-slate-200">
                <Link href="/dashboard/coach">Modo Coach</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 font-bold border-2 border-slate-200">
                <Link href="/dashboard/player">Modo Jugador</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
