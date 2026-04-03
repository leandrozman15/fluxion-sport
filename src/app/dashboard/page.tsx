
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, collectionGroup } from "firebase/firestore";

/**
 * Motor de Redirección y Vinculación de Fluxion Sport.
 * Sincroniza el UID de Auth con el Legajo de Firestore para asegurar el acceso real.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function determineRoleAndLink() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let userData: any = null;
        let sourceColl = "";
        let docId = "";

        // --- FASE 1: BUSCAR EN STAFF (users) ---
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          userData = staffByUid.data();
        } else {
          const staffByEmailId = await getDoc(doc(firestore, "users", email));
          if (staffByEmailId.exists()) {
            userData = staffByEmailId.data();
            sourceColl = "users";
            docId = email;
          } else {
            const staffByQuery = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
            if (!staffByQuery.empty) {
              userData = staffByQuery.docs[0].data();
              sourceColl = "users";
              docId = staffByQuery.docs[0].id;
            }
          }
        }

        // --- FASE 2: BUSCAR EN JUGADORES (all_players_index) ---
        if (!userData) {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            userData = playerByUid.data();
          } else {
            const playerByEmailId = await getDoc(doc(firestore, "all_players_index", email));
            if (playerByEmailId.exists()) {
              userData = playerByEmailId.data();
              sourceColl = "all_players_index";
              docId = email;
            } else {
              const playerByQuery = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
              if (!playerByQuery.empty) {
                userData = playerByQuery.docs[0].data();
                sourceColl = "all_players_index";
                docId = playerByQuery.docs[0].id;
              }
            }
          }
        }

        // --- FASE 3: BÚSQUEDA PROFUNDA (Collection Group) ---
        if (!userData && email) {
          const groupSnap = await getDocs(query(collectionGroup(firestore, "players"), where("email", "==", email)));
          if (!groupSnap.empty) {
            userData = { ...groupSnap.docs[0].data(), role: 'player' };
            // Si la encontramos aquí, la registramos en el índice global para el futuro
            await setDoc(doc(firestore, "all_players_index", email), { ...userData, id: email }, { merge: true });
            sourceColl = "all_players_index";
            docId = email;
          }
        }

        // --- FASE 4: VINCULAR Y REDIRIGIR ---
        if (userData) {
          // Vincular UID si lo encontramos por email
          if (sourceColl && docId) {
            await setDoc(doc(firestore, sourceColl, docId), { uid: user.uid }, { merge: true });
          }

          const role = userData.role || 'player';
          
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${userData.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          return router.replace('/dashboard/player');
        }

        // Si no hay datos, enviamos al hub de jugador (que mostrará "Ficha no vinculada")
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Redirect Error:", e);
        router.replace('/login');
      }
    }

    if (!isUserLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        determineRoleAndLink();
      }
    }
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex flex-col h-[60vh] items-center justify-center space-y-4 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-white opacity-20" />
      <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Sincronizando Legajo Oficial...
      </p>
    </div>
  );
}
