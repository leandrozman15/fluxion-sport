
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

/**
 * Motor de Redirección Principal de Fluxion Sport.
 * Determina el destino del usuario basándose en su rol jerárquico en Firestore.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. PRIORIDAD: Buscar Perfil en STAFF (users)
        // Intentamos por UID (seguro) y por Email (compatibilidad registros externos)
        const staffDoc = await getDoc(doc(firestore, "users", user.uid));
        let userData = staffDoc.exists() ? staffDoc.data() : null;

        if (!userData && email) {
          const staffByEmail = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!staffByEmail.empty) userData = staffByEmail.docs[0].data();
        }

        // Si es STAFF, dirigimos según su cargo administrativo/técnico
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

          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) {
            return router.replace('/dashboard/coach');
          }

          // Fallback para jugadores registrados en la tabla users
          if (role === 'player') {
            return router.replace('/dashboard/player');
          }
        }

        // 2. SEGUNDA OPCIÓN: Buscar en PADRÓN DE JUGADORES (all_players_index)
        // Esto es para deportistas que no son staff
        const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
        if (playerByUid.exists()) {
          return router.replace('/dashboard/player');
        }

        if (email) {
          const playerByEmail = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
          if (!playerByEmail.empty) {
            return router.replace('/dashboard/player');
          }
        }

        // 3. FALLBACK: Si no hay perfil, asumimos rol Jugador Invitado
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Redirect Error:", e);
        // En caso de error crítico, volvemos al login para re-autenticar
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
        Sincronizando con Fluxion Sport...
      </p>
    </div>
  );
}
