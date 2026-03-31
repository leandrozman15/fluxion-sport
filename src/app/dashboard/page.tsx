
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      if (!user || !firestore) return;
      try {
        const userEmail = user.email?.toLowerCase().trim() || "";
        
        // 1. Validar primero en Staff (users) por UID o Email
        const userDocRef = doc(firestore, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        let userData = userDoc.exists() ? userDoc.data() : null;

        if (!userData) {
          const qStaff = query(collection(firestore, "users"), where("email", "==", userEmail));
          const staffSnap = await getDocs(qStaff);
          if (!staffSnap.empty) userData = staffSnap.docs[0].data();
        }

        if (userData) {
          const role = userData.role;
          if (role === 'coach') router.replace('/dashboard/coach');
          else if (role === 'coordinator') router.replace('/dashboard/coordinator');
          else if (userData.clubId) router.replace(`/dashboard/clubs/${userData.clubId}`);
          else router.replace('/dashboard/clubs');
          return;
        }

        // 2. Si no es staff, buscar en jugadores
        const playerSnap = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", userEmail)));
        if (!playerSnap.empty) {
          router.replace('/dashboard/player');
          return;
        }

        // 3. Fallback: es un usuario nuevo o desarrollador anónimo
        router.replace('/dashboard/clubs');

      } catch (e) {
        console.error("Error en redireccionamiento de dashboard:", e);
        router.replace('/login');
      }
    }
    if (!isUserLoading) redirect();
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white opacity-50" />
    </div>
  );
}
