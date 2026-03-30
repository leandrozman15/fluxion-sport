
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { doc, getDoc, collection, getDocs, limit } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      router.push("/login");
    } else {
      const checkRoleAndRedirect = async () => {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            const clubId = userDoc.data().clubId;

            // La app "nace" desde el dashboard del club
            if (role === 'admin' || role === 'fed_admin') {
              // Si es admin global, vamos al listado de clubes para entrar a uno
              router.push('/dashboard/clubs');
              return;
            }

            if (clubId) {
              // Si tiene club asignado, va directo a su dashboard institucional
              router.push(`/dashboard/clubs/${clubId}`);
              return;
            }

            // Fallback por rol si no hay clubId específico vinculado al usuario directo
            switch (role) {
              case 'coordinator':
              case 'club_admin':
                router.push('/dashboard/coordinator');
                break;
              case 'coach':
                router.push('/dashboard/coach');
                break;
              case 'player':
                router.push('/dashboard/player');
                break;
              default:
                router.push('/dashboard');
            }
          } else {
            // Si es un usuario nuevo o sin perfil, intentamos mandarlo a clubes
            router.push('/dashboard/clubs');
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
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-foreground font-black uppercase tracking-widest text-[10px] animate-pulse">Iniciando Fluxion Sport...</p>
      </div>
    </div>
  );
}
