
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield, UserCheck, UserCircle, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchIdentity() {
      if (!user || !firestore) return;
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let finalProfile = null;

        const qStaff = query(collection(firestore, "users"), where("email", "==", email));
        const staffSnap = await getDocs(qStaff);
        
        if (!staffSnap.empty) {
          finalProfile = staffSnap.docs[0].data();
        } else {
          const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
          const playerSnap = await getDocs(qPlayer);
          if (!playerSnap.empty) {
            finalProfile = { ...playerSnap.docs[0].data(), role: 'player' };
          }
        }

        if (finalProfile) {
          setProfile(finalProfile);
          if (finalProfile.clubId) {
            const clubSnap = await getDoc(doc(firestore, "clubs", finalProfile.clubId));
            if (clubSnap.exists()) setClub(clubSnap.data());
          }
        }
      } catch (e) { console.error("Error en cabecera:", e); }
    }
    fetchIdentity();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  const role = profile?.role || "player";
  const sport = profile?.sport || "hockey";

  const getRoleDisplay = () => {
    switch(role) {
      case 'admin': 
      case 'club_admin':
        return { label: "Director Club", icon: Shield, color: "text-primary" };
      case 'coordinator': 
        return { 
          label: `Coordinador ${sport === 'rugby' ? 'Rugby 🏉' : 'Hockey 🏑'}`, 
          icon: Settings, 
          color: "text-orange-600" 
        };
      case 'coach': return { label: "Entrenador Oficial", icon: UserCheck, color: "text-blue-600" };
      case 'player': return { label: "Jugador Federado", icon: UserCircle, color: "text-green-600" };
      default: return { label: "Miembro del Club", icon: UserCircle, color: "text-slate-500" };
    }
  };

  const display = getRoleDisplay();
  const isAdminView = role === 'admin' || role === 'club_admin';

  return (
    <div className="w-full px-8 pt-6 flex justify-end items-center gap-4 z-50">
      <div className={cn(
        "flex items-center gap-3 bg-white/95 backdrop-blur-md p-2 pl-4 pr-4 rounded-full border shadow-lg group transition-all",
        isAdminView ? "border-primary/30 ring-2 ring-primary/10" : "border-slate-200"
      )}>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : profile?.name || user.email}
          </span>
          <span className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1", display.color)}>
            <display.icon className="h-2.5 w-2.5" />
            {display.label}
          </span>
        </div>

        <Avatar className={cn(
          "h-10 w-10 border-2 transition-transform group-hover:scale-105",
          isAdminView ? "border-primary shadow-primary/20" : "border-slate-100"
        )}>
          <AvatarImage src={isAdminView ? club?.logoUrl : profile?.photoUrl} className="object-cover" />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
            {profile?.firstName?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <button 
          onClick={handleLogout}
          className="text-destructive hover:text-red-600 flex items-center gap-2 px-2 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-tight">Salir</span>
        </button>
      </div>
    </div>
  );
}
