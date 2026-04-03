
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        
        // 1. Buscamos Perfil por Email (ID primario en staff)
        const userDoc = await getDoc(doc(firestore, "users", email));
        let userData = userDoc.exists() ? userDoc.data() : null;

        // 2. Si no existe por Email, buscamos por UID (por si acaso)
        if (!userData) {
          const uidDoc = await getDoc(doc(firestore, "users", user.uid));
          if (uidDoc.exists()) userData = uidDoc.data();
        }

        // 3. Fallback: búsqueda por consulta de email
        if (!userData && email) {
          const staffSnap = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!staffSnap.empty) userData = staffSnap.docs[0].data();
        }

        if (userData) {
          const role = userData.role;
          const clubId = userData.clubId;

          // SuperAdmin va a su consola
          if (role === 'admin' || role === 'fed_admin') {
            return router.replace('/dashboard/superadmin');
          }

          // Otros roles de staff van a sus dashboards específicos
          if (clubId) {
            // VERIFICAR EXISTENCIA DEL CLUB PARA EVITAR DEAD-ENDS
            const clubCheck = await getDoc(doc(firestore, "clubs", clubId));
            if (!clubCheck.exists()) {
              // Limpiar referencia huérfana
              const userRef = doc(firestore, "users", userData.id || user.uid);
              setDocumentNonBlocking(userRef, { clubId: null }, { merge: true });
              return router.replace('/dashboard/player');
            }

            if (role === 'coordinator') return router.replace('/dashboard/coordinator');
            if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
            // Por defecto al club gestionado
            return router.replace(`/dashboard/clubs/${clubId}`);
          }
        }

        // 4. Si no es staff, buscamos en JUGADORES
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
        if (!playerSnap.empty) return router.replace('/dashboard/player');

        // 5. Fallback general
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Redirect Error:", e);
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
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Sincronizando con Fluxion Sport...
      </p>
    </div>
  );
}
