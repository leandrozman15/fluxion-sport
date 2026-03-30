
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, ShieldCheck, Trophy, UserCircle, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      if (!user || !firestore) return;
      try {
        const userSnap = await getDoc(doc(firestore, "users", user.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfile(userData);
          
          if (userData.clubId) {
            const clubSnap = await getDoc(doc(firestore, "clubs", userData.clubId));
            if (clubSnap.exists()) {
              setClub(clubSnap.data());
            }
          }
        }
      } catch (e) {
        console.error("Error fetching header data:", e);
      }
    }
    fetchData();
  }, [user, firestore]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  const isAdmin = profile?.role === 'admin' || profile?.role === 'fed_admin';
  const isCoordinator = profile?.role === 'coordinator' || profile?.role === 'club_admin';
  
  // Determinar etiqueta de rol con deporte para coordinadores
  const getRoleLabel = () => {
    if (isAdmin) return "Administrador Global";
    if (isCoordinator) {
      const sportLabel = profile?.sport === 'rugby' ? 'Rugby 🏉' : 'Hockey 🏑';
      return `Coordinador ${sportLabel}`;
    }
    if (profile?.role === 'coach') return "Entrenador Oficial";
    if (profile?.role === 'player') return "Deportista Federado";
    return profile?.role || "Usuario";
  };

  return (
    <div className="w-full px-8 pt-6 flex justify-end items-center gap-4 z-50">
      <div className={cn(
        "flex items-center gap-3 bg-white/95 backdrop-blur-md p-2 pl-4 pr-4 rounded-full border shadow-lg group transition-all hover:shadow-xl",
        isAdmin ? "border-primary/30 ring-2 ring-primary/10" : "border-slate-200"
      )}>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {profile?.name || user.displayName || user.email}
          </span>
          <span className={cn(
            "text-[9px] uppercase font-bold tracking-widest mt-1 flex items-center gap-1",
            isAdmin ? "text-primary" : isCoordinator ? "text-orange-600" : "text-slate-500"
          )}>
            {isAdmin ? <Trophy className="h-2.5 w-2.5" /> : 
             isCoordinator ? <Settings className="h-2.5 w-2.5" /> : 
             <ShieldCheck className="h-2.5 w-2.5" />}
            {getRoleLabel()}
          </span>
        </div>

        {/* Avatar / Escudo: El Admin muestra el logo del club (escudo) */}
        <Avatar className={cn(
          "h-10 w-10 border-2 transition-transform group-hover:scale-105",
          isAdmin ? "border-primary shadow-primary/20" : "border-slate-100"
        )}>
          <AvatarImage 
            src={isAdmin ? (club?.logoUrl || profile?.photoUrl) : profile?.photoUrl} 
            className="object-contain p-0.5" 
          />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
            {isAdmin ? <Trophy className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="text-destructive hover:text-destructive hover:bg-red-50 font-black uppercase text-[10px] tracking-tight h-9 gap-2 px-3"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir
        </Button>
      </div>
    </div>
  );
}
