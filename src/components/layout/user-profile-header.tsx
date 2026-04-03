
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield, UserCheck, UserCircle, Settings, ShieldCheck } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Encabezado de Perfil de Usuario.
 * Identifica el rol real del usuario sincronizando Staff y Jugadores.
 */
export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user || !firestore) return;
    const email = user.email?.toLowerCase().trim() || "";

    async function identifyUserProfile() {
      try {
        // 1. BUSCAR EN STAFF (users)
        const staffRef = doc(firestore, "users", user.uid);
        const staffSnap = await getDoc(staffRef);
        if (staffSnap.exists()) {
          setProfile(staffSnap.data());
          return;
        }

        // Por Email (staff registrado por administrador)
        if (email) {
          const qStaff = query(collection(firestore, "users"), where("email", "==", email));
          const staffByEmail = await getDocs(qStaff);
          if (!staffByEmail.empty) {
            setProfile(staffByEmail.docs[0].data());
            return;
          }
        }

        // 2. BUSCAR EN JUGADORES (all_players_index)
        const playerRef = doc(firestore, "all_players_index", user.uid);
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
          setProfile({ ...playerSnap.data(), role: 'player' });
          return;
        }

        if (email) {
          const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
          const playerByEmail = await getDocs(qPlayer);
          if (!playerByEmail.empty) {
            setProfile({ ...playerByEmail.docs[0].data(), role: 'player' });
            return;
          }
        }

        // Fallback genérico
        setProfile({ name: user.email, role: 'guest' });
      } catch (e) {
        console.error("Error identificando perfil en header:", e);
      }
    }

    identifyUserProfile();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  const role = profile?.role || "guest";
  const display = (() => {
    switch(role) {
      case 'admin': 
      case 'club_admin':
        return { label: "Director Club", icon: Shield, color: "text-primary", bg: "bg-primary/5" };
      case 'coordinator': 
        return { label: "Coordinador", icon: Settings, color: "text-orange-600", bg: "bg-orange-50" };
      case 'coach_lvl1':
      case 'coach_lvl2':
      case 'coach': 
        return { label: "Staff Técnico", icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50" };
      case 'player': 
        return { label: "Jugador Federado", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" };
      default: 
        return { label: "Usuario Fluxion", icon: UserCircle, color: "text-slate-500", bg: "bg-slate-50" };
    }
  })();

  return (
    <div className="w-full px-4 md:px-8 pt-6 flex justify-end items-center gap-4 z-[60]">
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md p-2 pl-2 pr-5 rounded-full border border-slate-200 shadow-lg group">
        <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm transition-transform group-hover:scale-105">
          <AvatarImage src={profile?.photoUrl} className="object-cover" />
          <AvatarFallback className={cn("text-xs font-black", display.bg, display.color)}>
            {profile?.firstName?.[0] || profile?.name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start min-w-[100px]">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.name || user.email}
          </span>
          <span className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1", display.color)}>
            <display.icon className="h-2.5 w-2.5" />
            {display.label}
          </span>
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <button 
          onClick={handleLogout} 
          className="text-destructive hover:text-red-600 flex items-center gap-2 px-2 transition-all hover:translate-x-0.5"
          title="Cerrar Sesión"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase hidden sm:inline">Salir</span>
        </button>
      </div>
    </div>
  );
}
