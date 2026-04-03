
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, collectionGroup } from "firebase/firestore";

/**
 * Motor de Redirección Principal de Fluxion Sport.
 * Determina el destino del usuario basándose en su rol jerárquico en Firestore.
 * Utiliza búsqueda en cascada: Staff -> Índice Global -> Búsqueda en Clubes.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let userData: any = null;
        let isPlayer = false;

        // 1. BUSCAR EN STAFF (users)
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          userData = staffByUid.data();
        } else if (email) {
          const staffByEmail = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!staffByEmail.empty) {
            userData = staffByEmail.docs[0].data();
            // Auto-vincular UID
            await setDoc(doc(firestore, "users", user.uid), { ...userData, uid: user.uid }, { merge: true });
          }
        }

        // 2. SI NO ES STAFF, BUSCAR EN ÍNDICE DE JUGADORES (all_players_index)
        if (!userData) {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            userData = playerByUid.data();
            isPlayer = true;
          } else if (email) {
            const playerByEmail = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
            if (!playerByEmail.empty) {
              userData = playerByEmail.docs[0].data();
              isPlayer = true;
              await setDoc(doc(firestore, "all_players_index", user.uid), { ...userData, uid: user.uid }, { merge: true });
            }
          }
        }

        // 3. SI AÚN NO SE ENCUENTRA, BUSCAR EN TODOS LOS CLUBES (Collection Group)
        // Esto soluciona casos como el de Brenda donde el legajo solo está en el club
        if (!userData && email) {
          const playerGroupQuery = query(collectionGroup(firestore, "players"), where("email", "==", email));
          const groupSnap = await getDocs(playerGroupQuery);
          if (!groupSnap.empty) {
            userData = { ...groupSnap.docs[0].data(), role: 'player' };
            isPlayer = true;
            // Registrar en el índice global para rapidez futura
            await setDoc(doc(firestore, "all_players_index", user.uid), { 
              ...userData, 
              uid: user.uid,
              id: userData.id || email 
            }, { merge: true });
          }
        }

        // 4. REDIRECCIÓN BASADA EN ROL DETECTADO
        if (userData) {
          const role = userData.role;
          
          if (role === 'admin' || role === 'fed_admin') {
            return router.replace('/dashboard/superadmin');
          }
          
          if (role === 'club_admin') {
            return router.replace(`/dashboard/clubs/${userData.clubId}`);
          }

          if (role === 'coordinator') {
            return router.replace('/dashboard/coordinator');
          }

          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role) && !isPlayer) {
            return router.replace('/dashboard/coach');
          }

          return router.replace('/dashboard/player');
        }

        // 5. FALLBACK: Si no hay perfil en ninguna parte, es un usuario nuevo/invitado
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
        determineRoleAndRedirect();
      }
    }
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex flex-col h-[60vh] items-center justify-center space-y-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Identificando Acceso Oficial...
      </p>
    </div>
  );
}
