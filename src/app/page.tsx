
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
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
          const email = user.email?.toLowerCase().trim() || "";
          let role = null;
          let clubId = null;

          // 1. Buscamos primero en Staff (Admin, Coordinador, Coach)
          const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          
          if (!staffSnap.empty) {
            const data = staffSnap.docs[0].data();
            role = data.role;
            clubId = data.clubId;
          } else {
            // 2. Si no es staff, buscamos en el padrón de jugadores
            const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
            if (!playerSnap.empty) {
              role = 'player';
              clubId = playerSnap.docs[0].data().clubId;
            }
          }

          // Redirección basada en Rol Real
          if (role === 'admin' || role === 'fed_admin') {
            router.replace('/dashboard/superadmin');
          } else if (role === 'coordinator') {
            router.replace('/dashboard/coordinator');
          } else if (role === 'coach' || role === 'coach_lvl1' || role === 'coach_lvl2') {
            router.replace('/dashboard/coach');
          } else if (role === 'player') {
            router.replace('/dashboard/player');
          } else if (clubId) {
            router.replace(`/dashboard/clubs/${clubId}`);
          } else {
            // Fallback para administradores sin club asignado (Desarrollador)
            router.replace('/dashboard/clubs');
          }
        } catch (e) {
          console.error("Error redireccionando:", e);
          router.replace('/dashboard/clubs');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, isUserLoading, router, firestore]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center space-y-6 animate-pulse">
        <div className="bg-white p-4 rounded-3xl shadow-2xl inline-block border-4 border-primary/20">
          <Trophy className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white tracking-tighter">Fluxion Sport</h2>
          <p className="text-primary-foreground font-black uppercase tracking-[0.4em] text-[10px] opacity-80">Identificando Perfil...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mt-4 opacity-50" />
      </div>
    </div>
  );
}
