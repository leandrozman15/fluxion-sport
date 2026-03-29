
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.push("/login");
    } else {
      // Determinar a qué dashboard enviar según el rol guardado en la base de datos
      const checkRoleAndRedirect = async () => {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === 'player') router.push('/dashboard/player');
            else if (role === 'coach') router.push('/dashboard/coach');
            else if (role === 'referee') router.push('/dashboard/referee');
            else router.push('/dashboard');
          } else {
            // Si no hay perfil, intentamos ver si es un jugador en el índice global
            router.push('/dashboard');
          }
        } catch (e) {
          console.error("Error redireccionando:", e);
          router.push('/dashboard');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, isUserLoading, router, firestore]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground font-bold animate-pulse">Cargando SportsManager...</p>
      </div>
    </div>
  );
}
