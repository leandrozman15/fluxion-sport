
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

/**
 * MOTOR DE REDIRECCIÓN Y SOLDADURA DE IDENTIDAD (V6 - MIGRACIÓN COMPLETA)
 * Vincula UID <-> EMAIL y ELIMINA los documentos originales basados en email
 * para evitar duplicados y desincronización.
 */
export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function bindIdentityAndRedirect() {
      if (!user || !firestore) return;
      
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let finalProfile: any = null;

        // 1. BUSCAR VÍNCULO EXISTENTE POR UID (ya migrado)
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          finalProfile = staffByUid.data();
        } else {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            finalProfile = { ...playerByUid.data(), role: 'player' };
          }
        }

        // 2. SI NO HAY VÍNCULO, BUSCAR POR EMAIL Y SOLDAR (UID = ID de documento)
        if (!finalProfile && email) {
          // Buscar en STAFF
          const qStaff = query(collection(firestore, "users"), where("email", "==", email));
          const snapStaff = await getDocs(qStaff);
          
          if (!snapStaff.empty) {
            const oldDoc = snapStaff.docs[0];
            const oldDocId = oldDoc.id;
            const data = oldDoc.data();

            // SOLDADURA MAESTRA: Creamos documento con ID = UID
            await setDoc(doc(firestore, "users", user.uid), {
              ...data,
              id: user.uid,
              uid: user.uid,
              email: email,
              updatedAt: new Date().toISOString()
            });

            // LIMPIEZA: Eliminar el documento original basado en email
            // para evitar duplicados en queries de staff
            if (oldDocId !== user.uid) {
              await deleteDoc(doc(firestore, "users", oldDocId));
              console.log(`[SOLDADURA] Staff migrado: ${oldDocId} → ${user.uid}`);

              // MIGRACIÓN DE coachId EN TEAMS: actualizar cualquier equipo que
              // tenía coachId = email (formato viejo) → coachId = uid (nuevo)
              if (data.clubId) {
                try {
                  const divsSnap = await getDocs(collection(firestore, "clubs", data.clubId, "divisions"));
                  for (const divDoc of divsSnap.docs) {
                    const teamsSnap = await getDocs(collection(firestore, "clubs", data.clubId, "divisions", divDoc.id, "teams"));
                    for (const teamDoc of teamsSnap.docs) {
                      if (teamDoc.data().coachId === oldDocId) {
                        await setDoc(
                          doc(firestore, "clubs", data.clubId, "divisions", divDoc.id, "teams", teamDoc.id),
                          { coachId: user.uid, coachEmail: email },
                          { merge: true }
                        );
                        console.log(`[SOLDADURA] coachId en team migrado: ${oldDocId} → ${user.uid} (team: ${teamDoc.id})`);
                      }
                    }
                  }
                } catch (migErr) {
                  console.error("[SOLDADURA] Error migrando coachId en teams:", migErr);
                }
              }
            }

            finalProfile = data;
          } else {
            // Buscar en JUGADORES (índice global)
            const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
            const snapPlayer = await getDocs(qPlayer);
            
            if (!snapPlayer.empty) {
              const oldDoc = snapPlayer.docs[0];
              const oldDocId = oldDoc.id;
              const data = oldDoc.data();

              // SOLDADURA MAESTRA JUGADOR: Crear doc con ID = UID en el índice global
              await setDoc(doc(firestore, "all_players_index", user.uid), {
                ...data,
                id: user.uid,
                uid: user.uid,
                role: 'player',
                updatedAt: new Date().toISOString()
              });

              // LIMPIEZA índice global
              if (oldDocId !== user.uid) {
                await deleteDoc(doc(firestore, "all_players_index", oldDocId));
                console.log(`[SOLDADURA] Índice jugador migrado: ${oldDocId} → ${user.uid}`);
              }

              // MIGRAR DOCUMENTO PRINCIPAL DEL JUGADOR DENTRO DEL CLUB
              if (data.clubId && oldDocId !== user.uid) {
                const oldPlayerRef = doc(firestore, "clubs", data.clubId, "players", oldDocId);
                const oldPlayerSnap = await getDoc(oldPlayerRef);
                if (oldPlayerSnap.exists()) {
                  const playerData = oldPlayerSnap.data();
                  await setDoc(doc(firestore, "clubs", data.clubId, "players", user.uid), {
                    ...playerData,
                    id: user.uid,
                    uid: user.uid,
                    updatedAt: new Date().toISOString()
                  });
                  await deleteDoc(oldPlayerRef);
                  console.log(`[SOLDADURA] Ficha club migrada: clubs/${data.clubId}/players/${oldDocId} → ${user.uid}`);
                }
              }

              finalProfile = { ...data, role: 'player' };
            }
          }
        }

        // 3. REDIRECCIÓN BASADA EN ROL VERIFICADO
        if (finalProfile) {
          const role = finalProfile.role || 'player';
          
          if (role === 'admin' || role === 'fed_admin') return router.replace('/dashboard/superadmin');
          if (role === 'club_admin') return router.replace(`/dashboard/clubs/${finalProfile.clubId}`);
          if (role === 'coordinator') return router.replace('/dashboard/coordinator');
          if (['coach', 'coach_lvl1', 'coach_lvl2'].includes(role)) return router.replace('/dashboard/coach');
          
          return router.replace('/dashboard/player');
        }

        // 4. FALLBACK: Jugador nuevo sin registro previo
        router.replace('/dashboard/player');

      } catch (e) {
        console.error("Critical Identity Redirection Error:", e);
        router.replace('/login');
      }
    }

    if (!isUserLoading) {
      if (!user) {
        router.replace('/login');
      } else {
        bindIdentityAndRedirect();
      }
    }
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-slate-950">
      <div className="text-center space-y-6">
        <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl inline-block border-4 border-primary/10">
          <Trophy className="h-14 w-14 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Fluxion Sport</h2>
          <p className="text-white/40 font-bold uppercase tracking-[0.2em] text-[9px] animate-pulse">Sincronizando Identidad Oficial...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto opacity-20" />
      </div>
    </div>
  );
}
