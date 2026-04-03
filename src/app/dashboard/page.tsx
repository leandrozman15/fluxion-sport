
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Motor de Redireccionamiento Maestro.
 * Prioriza Roles Deportivos (Coordinador/Coach) sobre los Administrativos.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. Buscar en STAFF (Jerarquía: SuperAdmin -> Coordinador -> Coach -> ClubAdmin)
        const staffQuery = query(collection(firestore, "users"), where("email", "==", email));
        const staffSnap = await getDocs(staffQuery);
        
        if (!staffSnap.empty) {
          const staffData = staffSnap.docs[0].data();
          const role = staffData.role;
          const clubId = staffData.clubId;

          console.log("Fluxion Auth - Role Detectado:", role);

          // PRIORIDAD 1: Super Administradores
          if (role === 'admin' || role === 'fed_admin') {
            return router.replace('/dashboard/superadmin');
          } 
          
          // PRIORIDAD 2: Coordinadores (Consola Deportiva)
          if (role === 'coordinator') {
            return router.replace('/dashboard/coordinator');
          } 
          
          // PRIORIDAD 3: Entrenadores (Consola Técnica - Incluye Nivel 1 y Nivel 2)
          if (role === 'coach' || role === 'coach_lvl1' || role === 'coach_lvl2') {
            return router.replace('/dashboard/coach');
          } 

          // PRIORIDAD 4: Directores de Club (Panel Administrativo)
          if (role === 'club_admin' || clubId) {
            return router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
          }
        }

        // 2. JUGADORES (Hub del Socio)
        const playerQuery = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const playerSnap = await getDocs(playerQuery);
        
        if (!playerSnap.empty) {
          return router.replace('/dashboard/player');
        }

        // 3. Fallback: Sin vinculación institucional
        router.replace('/dashboard/clubs');

      } catch (e) {
        console.error("Error crítico en redireccionamiento:", e);
        router.replace('/login');
      }
    }

    if (!isUserLoading) {
      if (!user) router.replace('/login');
      else determineRoleAndRedirect();
    }
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex flex-col h-[60vh] items-center justify-center space-y-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-50" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Identificando Perfil Deportivo...
      </p>
    </div>
  );
}
