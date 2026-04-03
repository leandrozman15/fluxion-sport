
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield, UserCheck, UserCircle, Settings, ShieldCheck, Loader2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Encabezado de Perfil de Usuario con Motor de Auto-Vinculación.
 */
export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const [identifying, setIdentifying] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user || !firestore) {
      setIdentifying(false);
      return;
    }
    
    const email = user.email?.toLowerCase().trim() || "";

    async function identifyAndLink() {
      setIdentifying(true);
      try {
        let foundData = null;
        let sourceColl = "";
        let docId = "";

        // 1. BUSCAR EN STAFF (users)
        // Intento 1: Por UID
        const staffByUid = await getDoc(doc(firestore, "users", user.uid));
        if (staffByUid.exists()) {
          foundData = staffByUid.data();
        } else {
          // Intento 2: Por ID = Email
          const staffByEmailId = await getDoc(doc(firestore, "users", email));
          if (staffByEmailId.exists()) {
            foundData = staffByEmailId.data();
            sourceColl = "users";
            docId = email;
          } else {
            // Intento 3: Por campo email
            const qStaff = query(collection(firestore, "users"), where("email", "==", email));
            const staffSnap = await getDocs(qStaff);
            if (!staffSnap.empty) {
              foundData = staffSnap.docs[0].data();
              sourceColl = "users";
              docId = staffSnap.docs[0].id;
            }
          }
        }

        // 2. BUSCAR EN JUGADORES (all_players_index) si no es staff
        if (!foundData) {
          const playerByUid = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (playerByUid.exists()) {
            foundData = { ...playerByUid.data(), role: 'player' };
          } else {
            const playerByEmailId = await getDoc(doc(firestore, "all_players_index", email));
            if (playerByEmailId.exists()) {
              foundData = { ...playerByEmailId.data(), role: 'player' };
              sourceColl = "all_players_index";
              docId = email;
            } else {
              const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
              const pSnap = await getDocs(qPlayer);
              if (!pSnap.empty) {
                foundData = { ...pSnap.docs[0].data(), role: 'player' };
                sourceColl = "all_players_index";
                docId = pSnap.docs[0].id;
              }
            }
          }
        }

        // 3. AUTO-VINCULACIÓN (Si lo encontramos por email, le grabamos el UID para siempre)
        if (foundData && sourceColl && docId) {
          await setDoc(doc(firestore, sourceColl, docId), { 
            uid: user.uid,
            updatedAt: new Date().toISOString() 
          }, { merge: true });
        }

        if (foundData) {
          setProfile(foundData);
        } else {
          setProfile({ name: user.email, role: 'guest' });
        }
      } catch (e) {
        console.error("Identity Error:", e);
      } finally {
        setIdentifying(false);
      }
    }

    identifyAndLink();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  const role = profile?.role || "guest";
  const display = (() => {
    if (identifying) return { label: "Sincronizando...", icon: Loader2, color: "text-slate-400", bg: "bg-slate-50" };
    
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
        return { label: "Jugadora Federada", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" };
      default: 
        return { label: "Usuario Fluxion", icon: UserCircle, color: "text-slate-500", bg: "bg-slate-50" };
    }
  })();

  const userName = profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.name || user.email;

  return (
    <div className="w-full px-4 md:px-8 pt-6 flex justify-end items-center gap-4 z-[60]">
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md p-2 pl-2 pr-5 rounded-full border border-slate-200 shadow-lg group">
        <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm transition-transform group-hover:scale-105">
          <AvatarImage src={profile?.photoUrl} className="object-cover" />
          <AvatarFallback className={cn("text-xs font-black", display.bg, display.color)}>
            {identifying ? <Loader2 className="h-4 w-4 animate-spin" /> : (userName?.[0]?.toUpperCase() || 'U')}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start min-w-[100px]">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {identifying ? "Identificando..." : userName}
          </span>
          <span className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1", display.color)}>
            <display.icon className={cn("h-2.5 w-2.5", identifying && "animate-spin")} />
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
