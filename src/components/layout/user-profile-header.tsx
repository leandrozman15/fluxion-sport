
"use client";

import { useFirebase } from "@/firebase";
import { useActiveRole } from "@/contexts/active-role-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Shield, UserCheck, UserCircle, Settings, ShieldCheck, Loader2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function UserProfileHeader() {
  const { user, auth } = useFirebase();
  const { roles, activeRole, switchRole, loading, profile, getRoleLabel } = useActiveRole();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!user) return null;

  const displayRole = activeRole || profile?.role || "player";

  const display = (() => {
    if (loading) return { label: "Validando...", icon: Loader2, color: "text-slate-400", bg: "bg-slate-50" };
    
    switch(displayRole) {
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
        return { label: "Socio Activo", icon: UserCircle, color: "text-slate-500", bg: "bg-slate-50" };
    }
  })();

  const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName}` : (profile?.name || user.email);

  return (
    <div className="w-full px-4 md:px-8 header-notch-safe flex justify-end items-center gap-4 z-[60]">
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md p-2 pl-2 pr-5 rounded-full border border-slate-200 shadow-lg group">
        <Avatar className="h-10 w-10 border-2 border-slate-100 shadow-sm transition-transform group-hover:scale-105">
          <AvatarImage src={profile?.photoUrl} className="object-cover" />
          <AvatarFallback className={cn("text-xs font-black", display.bg, display.color)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (displayName?.[0]?.toUpperCase() || 'U')}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col items-start min-w-[100px]">
          <span className="text-[11px] font-black text-slate-900 leading-none truncate max-w-[150px]">
            {displayName}
          </span>
          {roles.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1 hover:opacity-70 transition-opacity cursor-pointer", display.color)}>
                  <display.icon className="h-2.5 w-2.5" />
                  {getRoleLabel(displayRole)}
                  <ChevronDown className="h-2 w-2 ml-0.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                {roles.map(r => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => switchRole(r)}
                    className={cn("font-bold text-xs cursor-pointer", r === activeRole && "bg-primary/5 text-primary")}
                  >
                    {getRoleLabel(r)}
                    {r === activeRole && <span className="ml-auto text-[10px] text-primary">●</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className={cn("text-[9px] uppercase font-black tracking-widest mt-1 flex items-center gap-1", display.color)}>
              <display.icon className={cn("h-2.5 w-2.5", loading && "animate-spin")} />
              {display.label}
            </span>
          )}
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <button onClick={handleLogout} className="text-destructive hover:text-red-600 flex items-center gap-2 px-2 transition-all hover:translate-x-0.5">
          <LogOut className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase hidden sm:inline">Salir</span>
        </button>
      </div>
    </div>
  );
}
