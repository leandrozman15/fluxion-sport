
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

/**
 * Motor de Redireccionamiento Maestro con Autolimpieza de Seguridad.
 * Resuelve el conflicto de IDs de clubes eliminados.
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
        
        // 1. Intentar obtener el perfil por UID directamente (más fiable)
        const userRef = doc(firestore, "users", user.uid);
        let userSnap = await getDoc(userRef);
        let userData = userSnap.exists() ? userSnap.data() : null;

        // 2. Si no existe por UID, buscar por email (fallback para registros manuales)
        if (!userData) {
          const staffQuery = query(collection(firestore, "users"), where("email", "==", email));
          const staffSnap = await getDocs(staffQuery);
          if (!staffSnap.empty) {
            userData = staffSnap.docs[0].data();
          }
        }

        if (userData) {
          const role = userData.role;
          const clubId = userData.clubId;

          // VERIFICACIÓN CRÍTICA DE INTEGRIDAD INSTITUCIONAL
          if (clubId) {
            const clubDoc = await getDoc(doc(firestore, "clubs", clubId));
            if (!clubDoc.exists()) {
              // EL CLUB NO EXISTE: Limpieza forzada de la referencia huérfana
              await updateDoc(doc(firestore, "users", user.uid), { 
                clubId: null,
                role: role === 'admin' ? 'admin' : 'guest' 
              });
              
              toast({ 
                variant: "destructive", 
                title: "Institución no encontrada", 
                description: "La referencia al club anterior ha sido eliminada por seguridad." 
              });
              return router.replace('/dashboard/clubs');
            }
          }

          // Redirección por Rol vigente
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          if (clubId) {
            return router.replace(`/dashboard/clubs/${clubId}`);
          }
        }

        // 3. Buscar en JUGADORES
        const playerQuery = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const playerSnap = await getDocs(playerQuery);
        
        if (!playerSnap.empty) {
          const pData = playerSnap.docs[0].data();
          const clubDoc = await getDoc(doc(firestore, "clubs", pData.clubId));
          if (!clubDoc.exists()) {
            toast({ variant: "destructive", title: "Club Inactivo", description: "Tu club de origen ya no es parte del sistema nacional." });
            return router.replace('/login');
          }
          return router.replace('/dashboard/player');
        }

        // 4. Fallback total: No hay datos vinculados
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
        Sincronizando Identidad...
      </p>
    </div>
  );
}
