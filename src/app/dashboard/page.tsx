
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

/**
 * Motor de Redireccionamiento Maestro con Autolimpieza.
 * Verifica la integridad de los datos y limpia referencias a clubes eliminados.
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
        
        // 1. Buscar en STAFF (Colección 'users')
        const staffQuery = query(collection(firestore, "users"), where("email", "==", email));
        const staffSnap = await getDocs(staffQuery);
        
        if (!staffSnap.empty) {
          const staffDoc = staffSnap.docs[0];
          const staffData = staffDoc.data();
          const role = staffData.role;
          const clubId = staffData.clubId;

          // VERIFICACIÓN DE INTEGRIDAD INSTITUCIONAL
          if (clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", clubId));
            if (!clubDoc.exists()) {
              // EL CLUB YA NO EXISTE: Limpiamos la referencia en el perfil para evitar bucles
              await updateDoc(doc(firestore, "users", staffDoc.id), { 
                clubId: null,
                role: role === 'admin' ? 'admin' : 'guest' // Mantener superadmin pero resetear otros
              });
              
              toast({ 
                variant: "destructive", 
                title: "Institución no encontrada", 
                description: "La referencia a tu antiguo club ha sido eliminada por seguridad." 
              });
              return router.replace('/dashboard/clubs');
            }
          }

          // Redirección por Rol real y vigente
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          if (clubId) {
            return router.replace(`/dashboard/clubs/${clubId}`);
          }
        }

        // 2. Buscar en JUGADORES (Colección 'all_players_index')
        const playerQuery = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const playerSnap = await getDocs(playerQuery);
        
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          const clubDoc = await getDoc(doc(firestore, "clubs", pData.clubId));
          if (!clubDoc.exists()) {
            // El jugador pertenece a un club que ya no existe
            toast({ variant: "destructive", title: "Club Inactivo", description: "Tu club de origen ya no es parte del sistema nacional." });
            return router.replace('/login');
          }
          return router.replace('/dashboard/player');
        }

        // 3. Fallback: No hay datos vinculados en ninguna colección
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
        Validando Credenciales Institucionales...
      </p>
    </div>
  );
}
