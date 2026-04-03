
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield, UserCheck, UserCircle, Settings, Building2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Cabecera de Perfil Unificada.
 * Detecta y muestra el Rol Real del usuario basándose en su email institucional.
 */
export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const [club, setClub] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user || !firestore) return;
    const email = user.email?.toLowerCase().trim() || "";

    // 1. Escuchar cambios en el perfil de STAFF (users) por Email
    const qStaff = query(collection(firestore, "users"), where("email", "==", email));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      if (!snap.empty) {
        const staffData = snap.docs[0].data();
        setProfile(staffData);
        if (staffData.clubId) {
          getDoc(doc(firestore, "clubs", staffData.clubId)).then(clubSnap => {
            if (clubSnap.exists()) setClub({ ...clubSnap.data(), id: clubSnap.id });
          });
        }
      } else {
        // 2. Si no es staff, escuchar en el JUGADORES (all_players_index) por Email
        const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const unsubPlayer = onSnapshot(qPlayer, (pSnap) => {
          if (!pSnap.empty) {
            const pData = pSnap.docs[0].data();
            setProfile({ ...pData, role: 'player' });
            if (pData.clubId) {
              getDoc(doc(firestore, "clubs", pData.clubId)).then(clubSnap => {
                if (clubSnap.exists()) setClub({ ...clubSnap.data(), id: clubSnap.id });
              });
            }
          } else {
            // 3. Fallback: Usuario sin rol vinculado
            setProfile({ name: user.email, role: 'guest' });
          }
        });
        return () => unsubPlayer();
      }
    });

    return () => unsubStaff();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  const role = profile?.role || "guest";
  const sport = profile?.sport || "hockey";

  const getRoleDisplay = () => {
    switch(role) {
      case 'admin': 
      case 'club_admin':
        return { label: "Director Club", icon: Shield, color: "text-primary" };
      case 'coordinator': 
        return { 
          label: `Coord. ${sport === 'rugby' ? 'Rugby 🏉' : 'Hockey 🏑'}`, 
          icon: Settings, 
          color: "text-orange-600" 
        };
      case 'coach_lvl1':
        return { label: "Entrenador Nivel 1", icon: UserCheck, color: "text-blue-700" };
      case 'coach_lvl2':
        return { label: "Entrenador Nivel 2", icon: UserCheck, color: "text-blue-500" };
      case 'coach': 
        return { label: "Entrenador Oficial", icon: UserCheck, color: "text-blue-600" };
      case 'player': 
        return { label: "Jugador Federado", icon: UserCircle, color: "text-green-600" };
      default: 
        return { label: "Usuario Fluxion", icon: UserCircle, color: "text-slate-500" };
    }
  };

  const display = getRoleDisplay();
  const isAdminView = role === 'admin' || role === 'club_admin';

  return (
    <div className="w-full px-8 pt-6 flex justify-end items-center gap-4 z-50">
      <div className={cn(
        "flex items-center gap-4 bg-white/95 backdrop-blur-md p-2 pl-2 pr-5 rounded-full border shadow-lg group transition-all",
        isAdminView ? "border-primary/30 ring-2 ring-primary/10" : "border-slate-200"
      )}>
        <Avatar className={cn(
          "h-10 w-10 border-2 transition-transform group-hover:scale-105 shadow-sm",
          isAdminView ? "border-primary" : "border-slate-100"
        )}>
          <AvatarImage src={profile?.photoUrl} className="object-cover" />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-black uppercase">
            {profile?.firstName?.[0] || profile?.name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : profile?.name || user.email}
          </span>
          <span className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1", display.color)}>
            <display.icon className="h-2.5 w-2.5" />
            {display.label}
          </span>
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <button 
          onClick={handleLogout}
          className="text-destructive hover:text-red-600 flex items-center gap-2 px-2 transition-colors group/logout"
        >
          <LogOut className="h-4 w-4 group-hover/logout:translate-x-0.5 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-tight">Salir</span>
        </button>
      </div>
    </div>
  );
}
