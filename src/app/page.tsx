
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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

          // 1. Buscar por UID
          const userSnap = await getDoc(doc(firestore, "users", user.uid));
          if (userSnap.exists()) {
            role = userSnap.data().role;
            clubId = userSnap.data().clubId;
          } else {
            // 2. Buscar por Email en Staff
            const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
            if (!staffSnap.empty) {
              role = staffSnap.docs[0].data().role;
              clubId = staffSnap.docs[0].data().clubId;
            } else {
              // 3. Buscar por Email en Jugadores
              const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
              if (!playerSnap.empty) {
                role = 'player';
                clubId = playerSnap.docs[0].data().clubId;
              }
            }
          }

          // REDIRECCIÓN SEGÚN ROL DETECTADO
          if (role === 'coach') {
            router.replace('/dashboard/coach');
          } else if (role === 'admin' || role === 'fed_admin') {
            router.replace('/dashboard');
          } else if (role === 'coordinator' || role === 'club_admin') {
            router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
          } else if (role === 'player') {
            router.replace('/dashboard/player');
          } else {
            router.replace('/dashboard');
          }
        } catch (e) {
          console.error("Error redireccionando:", e);
          router.replace('/dashboard');
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
          <p className="text-primary-foreground font-black uppercase tracking-[0.4em] text-[10px] opacity-80">Validando Credenciales...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mt-4 opacity-50" />
      </div>
    </div>
  );
}
