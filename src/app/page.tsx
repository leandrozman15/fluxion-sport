
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import { doc, getDoc, collection, getDocs, limit } from "firebase/firestore";
import { Loader2, Trophy } from "lucide-react";

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

            if (role === 'admin' || role === 'fed_admin') {
              router.push('/dashboard/clubs');
              return;
            }

            if (clubId) {
              router.push(`/dashboard/clubs/${clubId}`);
              return;
            }

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900/20 backdrop-blur-md">
      <div className="text-center space-y-6 animate-pulse">
        <div className="bg-white p-4 rounded-3xl shadow-2xl inline-block border-4 border-primary/20">
          <Trophy className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-lg">Fluxion Sport</h2>
          <p className="text-primary-foreground font-black uppercase tracking-[0.4em] text-[10px] opacity-80">Sincronizando Ecosistema...</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mt-4 opacity-50" />
      </div>
    </div>
  );
}
