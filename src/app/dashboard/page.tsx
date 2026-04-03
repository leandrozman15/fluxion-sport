
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

/**
 * MOTOR DE REDIRECCIÓN Y SOLDADURA DE IDENTIDAD (V4)
 * Este es el único punto de entrada legal al dashboard.
 * Suelda el UID de Auth con el Legajo de Firestore para siempre.
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

        // 1. INTENTO DE LECTURA DIRECTA (UID)
        // Si esto funciona, el usuario ya está "soldado"
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          finalProfile = staffByUid.data();
        } else {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            finalProfile = { ...playerByUid.data(), role: 'player' };
          }
        }

        // 2. SI NO HAY VÍNCULO POR UID, BUSCAR POR EMAIL (Vínculo inicial)
        if (!finalProfile && email) {
          console.log("Binding identity for:", email);
          
          // Buscar en Staff
          const qStaff = query(collection(firestore, "users"), where("email", "==", email));
          const snapStaff = await getDocs(qStaff);
          
          if (!snapStaff.empty) {
            const data = snapStaff.docs[0].data();
            // SOLDADURA: Clonamos el registro usando el UID como ID real
            await setDoc(doc(firestore, "users", user.uid), {
              ...data,
              id: user.uid,
              uid: user.uid,
              updatedAt: new Date().toISOString()
            });
            finalProfile = data;
          } else {
            // Buscar en Jugadores
            const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
            const snapPlayer = await getDocs(qPlayer);
            
            if (!snapPlayer.empty) {
              const data = snapPlayer.docs[0].data();
              // SOLDADURA: Clonamos el registro en el índice global usando UID
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

        // 3. REDIRECCIÓN BASADA EN ROL FINAL
        if (finalProfile) {
          const role = finalProfile.role || 'player';
          console.log("Identity verified. Role:", role);

          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${finalProfile.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          // Si es player o no tiene rol específico, va al Hub de Jugador
          return router.replace('/dashboard/player');
        }

        // 4. FALLBACK: Si no existe legajo, lo tratamos como jugador nuevo sin club
        console.warn("No official record found for email. Falling back to Guest Player Hub.");
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Binding Error:", e);
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
    <div className="flex flex-col h-screen items-center justify-center space-y-6 text-center bg-slate-950">
      <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 backdrop-blur-2xl">
        <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4 opacity-40" />
        <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Autenticando</h2>
        <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] mt-2 animate-pulse">
          Sincronizando Legajo Institucional...
        </p>
      </div>
    </div>
  );
}
