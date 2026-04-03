
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

/**
 * Motor de Redirección y Vinculación Definitiva de Fluxion Sport.
 * Garantiza que el UID del usuario esté soldado al Legajo de Firestore.
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
        let originalDocId = "";

        // --- 1. BUSCAR EN STAFF (users) ---
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          userData = staffByUid.data();
        } else {
          // Buscar por Email si no está por UID
          const qStaff = query(collection(firestore, "users"), where("email", "==", email));
          const snapStaff = await getDocs(qStaff);
          if (!snapStaff.empty) {
            userData = snapStaff.docs[0].data();
            sourceColl = "users";
            originalDocId = snapStaff.docs[0].id;
          }
        }

        // --- 2. BUSCAR EN JUGADORES (all_players_index) ---
        if (!userData) {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            userData = { ...playerByUid.data(), role: 'player' };
          } else {
            const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
            const snapPlayer = await getDocs(qPlayer);
            if (!snapPlayer.empty) {
              userData = { ...snapPlayer.docs[0].data(), role: 'player' };
              sourceColl = "all_players_index";
              originalDocId = snapPlayer.docs[0].id;
            }
          }
        }

        // --- 3. VINCULACIÓN PERMANENTE (SOLDADURA) ---
        if (userData && sourceColl && originalDocId !== user.uid) {
          // Creamos una copia exacta del documento usando el UID como ID definitivo
          await setDoc(doc(firestore, sourceColl, user.uid), { 
            ...userData, 
            id: user.uid, 
            uid: user.uid,
            linkedEmail: email,
            updatedAt: new Date().toISOString() 
          }, { merge: true });
          
          // Si el ID original era el email, lo mantenemos como alias o lo dejamos estar
          // pero el sistema ya usará el UID de ahora en adelante.
        }

        if (userData) {
          const role = userData.role || 'player';
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${userData.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          return router.replace('/dashboard/player');
        }

        // Si no se encuentra nada, enviamos al hub de invitado/jugador para que pida vinculación
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
        Asegurando Identidad Oficial...
      </p>
    </div>
  );
}
