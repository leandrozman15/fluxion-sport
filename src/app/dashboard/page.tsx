
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

/**
 * Motor de Redireccionamiento Maestro.
 * Valida la existencia del club antes de permitir el acceso.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. Buscar en STAFF
        const staffQuery = query(collection(firestore, "users"), where("email", "==", email));
        const staffSnap = await getDocs(staffQuery);
        
        if (!staffSnap.empty) {
          const staffData = staffSnap.docs[0].data();
          const role = staffData.role;
          const clubId = staffData.clubId;

          // Verificar si el club existe si tiene uno asignado
          if (clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", clubId));
            if (!clubDoc.exists()) {
              toast({ 
                variant: "destructive", 
                title: "Institución no encontrada", 
                description: "Tu club ha sido removido del sistema. Contacta al administrador global." 
              });
              return router.replace('/dashboard/clubs');
            }
          }

          // PRIORIDAD 1: Super Administradores
          if (role === 'admin' || role === 'fed_admin') {
            return router.replace('/dashboard/superadmin');
          } 
          
          // PRIORIDAD 2: Coordinadores
          if (role === 'coordinator') {
            return router.replace('/dashboard/coordinator');
          } 
          
          // PRIORIDAD 3: Entrenadores
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) {
            return router.replace('/dashboard/coach');
          } 

          // PRIORIDAD 4: Directores de Club
          if (role === 'club_admin' || clubId) {
            return router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
          }
        }

        // 2. JUGADORES
        const playerQuery = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const playerSnap = await getDocs(playerQuery);
        
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          // Verificar club del jugador
          const clubDoc = await getDoc(doc(firestore, "clubs", pData.clubId));
          if (!clubDoc.exists()) {
            toast({ variant: "destructive", title: "Club Inactivo", description: "Tu institución ya no forma parte del sistema." });
            return router.replace('/login');
          }
          return router.replace('/dashboard/player');
        }

        // 3. Fallback
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
  }, [user, isUserLoading, firestore, router, toast]);

  return (
    <div className="flex flex-col h-[60vh] items-center justify-center space-y-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-50" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Validando Credenciales Institucionales...
      </p>
    </div>
  );
}
