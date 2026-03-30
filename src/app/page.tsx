
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Trophy } from "lucide-react";

export default function Home() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.push("/login");
    } else {
      const checkRoleAndRedirect = async () => {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const role = data.role;
            const clubId = data.clubId;

            // 1. Entrenadores (Coach) - PRIORIDAD: Acceso directo a Pizarra
            if (role === 'coach') {
              router.replace('/dashboard/coach');
              return;
            }

            // 2. Administradores Globales
            if (role === 'admin' || role === 'fed_admin') {
              router.replace('/dashboard');
              return;
            }

            // 3. Coordinadores y Admins de Club
            if (role === 'coordinator' || role === 'club_admin') {
              if (clubId) {
                router.replace(`/dashboard/clubs/${clubId}`);
              } else {
                router.replace('/dashboard/clubs');
              }
              return;
            }

            // 4. Jugadores
            if (role === 'player') {
              router.replace('/dashboard/player');
              return;
            }

            // Fallback general
            router.replace('/dashboard/player');
          } else {
            // Si el usuario no tiene documento de perfil, asumimos que es nuevo o demo
            router.replace('/dashboard');
          }
        } catch (e) {
          console.error("Error redireccionando por rol:", e);
          router.replace('/login');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, isUserLoading, router, firestore]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900/20 backdrop-blur-md">
      <div className="text-center space-y-6 animate-pulse">
        <div className="bg-white p-4 rounded-3xl shadow-2xl inline-block border-4 border-primary/20">
          <Trophy className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">Fluxion Sport</h2>
          <p className="text-primary-foreground font-black uppercase tracking-[0.4em] text-[10px] opacity-80">Sincronizando Ecosistema...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mt-4 opacity-50" />
      </div>
    </div>
  );
}
