
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
      const checkRoleAndRedirect = async () => {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            switch (role) {
              case 'admin':
              case 'fed_admin':
                router.push('/dashboard');
                break;
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
                router.push('/dashboard/player');
            }
          } else {
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
        <p className="text-muted-foreground font-bold animate-pulse">Iniciando SportsManager...</p>
      </div>
    </div>
  );
}
