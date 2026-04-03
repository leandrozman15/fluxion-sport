
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. Obtener Perfil prioritario
        const userRef = doc(firestore, "users", user.uid);
        let userSnap = await getDoc(userRef);
        let userData = userSnap.exists() ? userSnap.data() : null;

        if (!userData) {
          const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!staffSnap.empty) userData = staffSnap.docs[0].data();
        }

        if (userData) {
          const role = userData.role;
          const clubId = userData.clubId;

          // PRIORIDAD 1: SuperAdmin siempre va a su consola
          if (role === 'admin' || role === 'fed_admin') {
            return router.replace('/dashboard/superadmin');
          }

          // PRIORIDAD 2: Verificar Club si existe en el perfil
          if (clubId) {
            try {
              const clubDoc = await getDoc(doc(firestore, "clubs", clubId));
              if (clubDoc.exists()) {
                if (role === 'coordinator') return router.replace('/dashboard/coordinator');
                if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
                return router.replace(`/dashboard/clubs/${clubId}`);
              } else {
                // Solo limpiamos si el club REALMENTE no existe (404)
                console.warn("Club ID in profile no longer exists in Firestore.");
                updateDocumentNonBlocking(doc(firestore, "users", user.uid), { clubId: null });
                return router.replace('/dashboard/clubs');
              }
            } catch (e: any) {
              // Si es un error de permisos o red, NO borramos el clubId, 
              // simplemente vamos al padrón de clubes y dejamos que los listeners manejen el error.
              console.error("Firestore Access Error during redirect:", e);
              return router.replace('/dashboard/clubs');
            }
          }
          
          // Si no tiene clubId, al padrón
          return router.replace('/dashboard/clubs');
        }

        // 2. Buscar en JUGADORES
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
        if (!playerSnap.empty) return router.replace('/dashboard/player');

        // 3. Fallback
        router.replace('/dashboard/clubs');

      } catch (e) {
        console.error("Critical Redirect Error:", e);
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
        Sincronizando con Fluxion Sport...
      </p>
    </div>
  );
}
