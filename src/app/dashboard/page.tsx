
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

/**
 * MOTOR DE REDIRECCIÓN Y SOLDADURA DE IDENTIDAD (V5 - FINAL)
 * Este componente es el corazón de la vinculación UID <-> EMAIL.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function bindIdentityAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let finalProfile: any = null;

        // 1. BUSCAR VÍNCULO EXISTENTE POR UID
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          finalProfile = staffByUid.data();
        } else {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            finalProfile = { ...playerByUid.data(), role: 'player' };
          }
        }

        // 2. SI NO HAY VÍNCULO, BUSCAR POR EMAIL Y SOLDAR (UID = ID de documento)
        if (!finalProfile && email) {
          // Buscar en STAFF
          const qStaff = query(collection(firestore, "users"), where("email", "==", email));
          const snapStaff = await getDocs(qStaff);
          
          if (!snapStaff.empty) {
            const data = snapStaff.docs[0].data();
            // SOLDADURA MAESTRA: Creamos documento con ID = UID
            await setDoc(doc(firestore, "users", user.uid), {
              ...data,
              id: user.uid,
              uid: user.uid,
              updatedAt: new Date().toISOString()
            });
            finalProfile = data;
          } else {
            // Buscar en JUGADORES
            const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
            const snapPlayer = await getDocs(qPlayer);
            
            if (!snapPlayer.empty) {
              const data = snapPlayer.docs[0].data();
              // SOLDADURA MAESTRA JUGADOR: Creamos documento con ID = UID
              await setDoc(doc(firestore, "all_players_index", user.uid), {
                ...data,
                id: user.uid,
                uid: user.uid,
                role: 'player',
                updatedAt: new Date().toISOString()
              });
              finalProfile = { ...data, role: 'player' };
            }
          }
        }

        // 3. REDIRECCIÓN BASADA EN ROL VERIFICADO
        if (finalProfile) {
          const role = finalProfile.role || 'player';
          
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${finalProfile.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          return router.replace('/dashboard/player');
        }

        // 4. FALLBACK: Jugador nuevo sin registro previo
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Identity Redirection Error:", e);
        router.replace('/login');
      }
    }

    if (!isUserLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        bindIdentityAndRedirect();
      }
    }
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-950">
      <div className="text-center space-y-6">
        <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl inline-block border-4 border-primary/10">
          <Trophy className="h-14 w-14 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Fluxion Sport</h2>
          <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[9px] animate-pulse">Sincronizando Identidad Oficial...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto opacity-20" />
      </div>
    </div>
  );
}
