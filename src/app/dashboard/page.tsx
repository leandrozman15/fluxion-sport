
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

/**
 * Motor de Redireccionamiento Maestro.
 * Limpia referencias de clubes inexistentes y gestiona el estado inicial de la app.
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

          // Verificar si el club existe
          if (clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", clubId));
            if (!clubDoc.exists()) {
              // ERROR DE CACHE DETECTADO: El club ya no existe. 
              // Limpiamos la referencia en el perfil del usuario para permitir un nuevo comienzo.
              await updateDoc(doc(firestore, "users", staffSnap.docs[0].id), { clubId: null });
              
              toast({ 
                variant: "destructive", 
                title: "Institución no encontrada", 
                description: "Tu club anterior ya no existe. Selecciona o registra uno nuevo." 
              });
              return router.replace('/dashboard/clubs');
            }
          }

          // Redirección por Rol
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          if (role === 'club_admin' || clubId) {
            return router.replace(clubId ? `/dashboard/clubs/${clubId}` : '/dashboard/clubs');
          }
        }

        // 2. Buscar en JUGADORES
        const playerQuery = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const playerSnap = await getDocs(playerQuery);
        
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          const clubDoc = await getDoc(doc(firestore, "clubs", pData.clubId));
          if (!clubDoc.exists()) {
            toast({ variant: "destructive", title: "Club Inactivo", description: "Tu institución ha sido removida del sistema." });
            return router.replace('/login');
          }
          return router.replace('/dashboard/player');
        }

        // 3. Fallback: No hay datos vinculados (App recién instalada o vacía)
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
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Sincronizando Sistema...
      </p>
    </div>
  );
}
