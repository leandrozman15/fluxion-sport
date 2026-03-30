
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      if (!user || !firestore) return;
      const snap = await getDoc(doc(firestore, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
    }
    fetchProfile();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="w-full px-8 pt-6 flex justify-end items-center gap-4 z-50">
      {/* Tarjeta de Usuario integrada en la pantalla */}
      <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md p-2 pl-4 pr-4 rounded-full border shadow-sm group transition-all hover:shadow-md">
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {profile?.name || user.email}
          </span>
          <span className="text-[9px] uppercase text-primary font-bold tracking-widest mt-0.5">
            {profile?.role || "Usuario"}
          </span>
        </div>
        <Avatar className="h-9 w-9 border-2 border-primary/10">
          <AvatarImage src={profile?.photoUrl} />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="text-destructive hover:text-destructive hover:bg-red-50 font-black uppercase text-[10px] tracking-tight h-8 gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir
        </Button>
      </div>
    </div>
  );
}
