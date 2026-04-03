
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";

/**
 * Motor Maestro de Redirección y Soldadura de Identidad.
 * Vincula permanentemente el UID de Auth con el Legajo de Firestore.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndLink() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let userData: any = null;
        let sourceColl = "";

        // 1. BUSCAR POR UID (Vínculo ya existente)
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          userData = staffByUid.data();
          sourceColl = "users";
        } else {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            userData = { ...playerByUid.data(), role: 'player' };
            sourceColl = "all_players_index";
          }
        }

        // 2. BUSCAR POR EMAIL (Vínculo pendiente)
        if (!userData && email) {
          const qStaff = query(collection(firestore, "users"), where("email", "==", email));
          const snapStaff = await getDocs(qStaff);
          if (!snapStaff.empty) {
            userData = snapStaff.docs[0].data();
            sourceColl = "users";
          } else {
            const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
            const snapPlayer = await getDocs(qPlayer);
            if (!snapPlayer.empty) {
              userData = { ...snapPlayer.docs[0].data(), role: 'player' };
              sourceColl = "all_players_index";
            }
          }

          // 3. SOLDADURA DE IDENTIDAD (UID -> Document ID)
          if (userData && sourceColl) {
            await setDoc(doc(firestore, sourceColl, user.uid), { 
              ...userData, 
              id: user.uid, 
              uid: user.uid,
              updatedAt: new Date().toISOString() 
            }, { merge: true });
          }
        }

        // REDIRECCIÓN BASADA EN ROL
        if (userData) {
          const role = userData.role || 'player';
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${userData.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          return router.replace('/dashboard/player');
        }

        // Fallback: Perfil no encontrado, enviar a Hub de Jugador para solicitar vinculación
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Redirect Error:", e);
        router.replace('/login');
      }
    }

    if (!isUserLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        determineRoleAndLink();
      }
    }
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex flex-col h-[60vh] items-center justify-center space-y-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Autenticando Perfil Oficial...
      </p>
    </div>
  );
}
