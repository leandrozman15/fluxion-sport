
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardRedirectPage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === 'coach') router.replace('/dashboard/coach');
          else if (data.role === 'player') router.replace('/dashboard/player');
          else if (data.clubId) router.replace(`/dashboard/clubs/${data.clubId}`);
          else router.replace('/dashboard/clubs');
        } else {
          router.replace('/dashboard/player');
        }
      } catch (e) {
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
