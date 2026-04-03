
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, collectionGroup } from "firebase/firestore";

/**
 * Motor de Redirección y Vinculación de Fluxion Sport.
 * Sincroniza el UID de Auth con el Legajo de Firestore para asegurar el acceso real.
 * Utiliza una estrategia de búsqueda múltiple (ID, Email, UID Field).
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
        // 1.1 Intentar por UID directo
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          userData = staffByUid.data();
        } else {
          // 1.2 Intentar por Email como ID
          const staffByEmailId = await getDoc(doc(firestore, "users", email));
          if (staffByEmailId.exists()) {
            userData = staffByEmailId.data();
            sourceColl = "users";
            docId = email;
          } else {
            // 1.3 Intentar por campo UID o Email
            const qStaff = query(collection(firestore, "users"), where("uid", "==", user.uid));
            const snapStaff = await getDocs(qStaff);
            if (!snapStaff.empty) {
              userData = snapStaff.docs[0].data();
            } else if (email) {
              const qStaffEmail = query(collection(firestore, "users"), where("email", "==", email));
              const snapStaffEmail = await getDocs(qStaffEmail);
              if (!snapStaffEmail.empty) {
                userData = snapStaffEmail.docs[0].data();
                sourceColl = "users";
                docId = snapStaffEmail.docs[0].id;
              }
            }
          }
        }

        // --- FASE 2: BUSCAR EN JUGADORES (all_players_index) ---
        if (!userData) {
          // 2.1 Intentar por UID directo
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            userData = { ...playerByUid.data(), role: 'player' };
          } else {
            // 2.2 Intentar por Email como ID
            const playerByEmailId = await getDoc(doc(firestore, "all_players_index", email));
            if (playerByEmailId.exists()) {
              userData = { ...playerByEmailId.data(), role: 'player' };
              sourceColl = "all_players_index";
              docId = email;
            } else {
              // 2.3 Intentar por campo UID o Email
              const qPlayer = query(collection(firestore, "all_players_index"), where("uid", "==", user.uid));
              const snapPlayer = await getDocs(qPlayer);
              if (!snapPlayer.empty) {
                userData = { ...snapPlayer.docs[0].data(), role: 'player' };
              } else if (email) {
                const qPlayerEmail = query(collection(firestore, "all_players_index"), where("email", "==", email));
                const snapPlayerEmail = await getDocs(qPlayerEmail);
                if (!snapPlayerEmail.empty) {
                  userData = { ...snapPlayerEmail.docs[0].data(), role: 'player' };
                  sourceColl = "all_players_index";
                  docId = snapPlayerEmail.docs[0].id;
                }
              }
            }
          }
        }

        // --- FASE 3: BÚSQUEDA PROFUNDA (Collection Group) ---
        if (!userData && email) {
          const groupSnap = await getDocs(query(collectionGroup(firestore, "players"), where("email", "==", email)));
          if (!groupSnap.empty) {
            userData = { ...groupSnap.docs[0].data(), role: 'player' };
            sourceColl = "all_players_index";
            docId = email;
            // Guardamos en el índice para futuras búsquedas rápidas
            await setDoc(doc(firestore, "all_players_index", email), { ...userData, id: email, uid: user.uid }, { merge: true });
          }
        }

        // --- FASE 4: VINCULAR Y REDIRIGIR ---
        if (userData) {
          // Vincular UID si lo encontramos por email para que la próxima vez entre por UID directo
          if (sourceColl && docId) {
            await setDoc(doc(firestore, sourceColl, docId), { uid: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
          }

          const role = userData.role || 'player';
          
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${userData.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          return router.replace('/dashboard/player');
        }

        // Si realmente no existe, se queda en la pantalla de "Perfil no vinculado" del hub de jugador
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
