"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useFirebase } from "@/firebase";

/**
 * Hook que verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Si no tiene acceso, redirige a /dashboard (el motor de identidad lo manda al lugar correcto).
 * Retorna { authorized, loading } para que la página pueda mostrar loading mientras verifica.
 */
export function useRoleGuard(allowedRoles: string[]) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const [state, setState] = useState<{ authorized: boolean; loading: boolean }>({ authorized: false, loading: true });

  useEffect(() => {
    async function checkRole() {
      if (isUserLoading) return;

      if (!user || !firestore) {
        router.replace("/login");
        return;
      }

      try {
        // Check staff profile
        const staffSnap = await getDoc(doc(firestore, "users", user.uid));
        if (staffSnap.exists()) {
          const data = staffSnap.data();
          const userRoles = data.roles && Array.isArray(data.roles) ? data.roles : [data.role].filter(Boolean);
          if (userRoles.some((r: string) => allowedRoles.includes(r))) {
            setState({ authorized: true, loading: false });
            return;
          }
        }

        // Check player index
        if (allowedRoles.includes("player")) {
          const playerSnap = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerSnap.exists()) {
            setState({ authorized: true, loading: false });
            return;
          }
        }

        // Not authorized — redirect to identity engine
        router.replace("/dashboard");
      } catch (e) {
        console.error("Role guard error:", e);
        router.replace("/dashboard");
      }
    }

    checkRole();
  }, [user, firestore, isUserLoading]);

  return state;
}
