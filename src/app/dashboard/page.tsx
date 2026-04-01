
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Motor de Redireccionamiento Inteligente.
 * Identifica el rol real del usuario cruzando datos de Staff y Jugadores por Email.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. Buscar en STAFF (Administradores, Coordinadores, Entrenadores)
        const staffQuery = query(collection(firestore, "users"), where("email", "==", email));
        const staffSnap = await getDocs(staffQuery);
        
        if (!staffSnap.empty) {
          const staffData = staffSnap.docs[0].data();
          const role = staffData.role;
          const clubId = staffData.clubId;

          console.log("Role detectado en Staff:", role);

          if (role === 'admin' || role === 'fed_admin') {
            router.replace('/dashboard/superadmin');
          } else if (role === 'club_admin') {
            router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
          } else if (role === 'coordinator') {
            router.replace('/dashboard/coordinator');
          } else if (role === 'coach') {
            router.replace('/dashboard/coach');
          } else {
            // Fallback para roles de staff no específicos
            router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
          }
          return;
        }

        // 2. Si no es staff, buscar en JUGADORES (Índice Global)
        const playerQuery = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const playerSnap = await getDocs(playerQuery);
        
        if (!playerSnap.empty) {
          console.log("Role detectado: Player");
          router.replace('/dashboard/player');
          return;
        }

        // 3. Usuario sin vinculación (Desarrollador o Usuario nuevo)
        console.log("Usuario sin vinculación institucional previa.");
        router.replace('/dashboard/clubs');

      } catch (e) {
        console.error("Error crítico en redireccionamiento de roles:", e);
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
        Sincronizando Consola de Gestión...
      </p>
    </div>
  );
}
