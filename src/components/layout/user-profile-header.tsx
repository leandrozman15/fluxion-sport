
"use client";

import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield, UserCheck, UserCircle, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function UserProfileHeader() {
  const { user, firestore, auth } = useFirebase();
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user || !firestore) return;
    const email = user.email?.toLowerCase().trim() || "";

    const unsubProfile = onSnapshot(doc(firestore, "users", user.uid), async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.clubId) {
          try {
            const clubSnap = await getDoc(doc(firestore, "clubs", data.clubId));
            if (clubSnap.exists()) {
              setProfile(data);
            } else {
              setProfile({ ...data, clubId: null, role: 'guest' });
            }
          } catch (e) {
            setProfile({ ...data, clubId: null, role: 'guest' });
          }
        } else {
          setProfile(data);
        }
      } else {
        const qStaff = query(collection(firestore, "users"), where("email", "==", email));
        onSnapshot(qStaff, (sSnap) => {
          if (!sSnap.empty) {
            setProfile(sSnap.docs[0].data());
          } else {
            const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
            onSnapshot(qPlayer, (pSnap) => {
              if (!pSnap.empty) setProfile({ ...pSnap.docs[0].data(), role: 'player' });
              else setProfile({ name: user.email, role: 'guest' });
            }, (err) => console.warn("Player index listener suppressed"));
          }
        }, (err) => console.warn("Staff listener suppressed"));
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${user.uid}`,
          operation: 'get'
        }));
      }
    });

    return () => unsubProfile();
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
        return { label: `Coord. ${sport === 'rugby' ? 'Rugby' : 'Hockey'}`, icon: Settings, color: "text-orange-600" };
      case 'coach_lvl1':
      case 'coach_lvl2':
      case 'coach': 
        return { label: "Staff Técnico", icon: UserCheck, color: "text-blue-600" };
      case 'player': 
        return { label: "Jugador Federado", icon: UserCircle, color: "text-green-600" };
      default: 
        return { label: "Usuario Fluxion", icon: UserCircle, color: "text-slate-500" };
    }
  };

  const display = getRoleDisplay();

  return (
    <div className="w-full px-8 pt-6 flex justify-end items-center gap-4 z-50">
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md p-2 pl-2 pr-5 rounded-full border border-slate-200 shadow-lg group transition-all">
        <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm">
          <AvatarImage src={profile?.photoUrl} className="object-cover" />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
            {profile?.firstName?.[0] || profile?.name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.name || user.email}
          </span>
          <span className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1", display.color)}>
            <display.icon className="h-2.5 w-2.5" />
            {display.label}
          </span>
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <button onClick={handleLogout} className="text-destructive hover:text-red-600 flex items-center gap-2 px-2 transition-colors">
          <LogOut className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase">Salir</span>
        </button>
      </div>
    </div>
  );
}
