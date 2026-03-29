
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Trophy, 
  UserCircle, 
  ShieldCheck, 
  CreditCard, 
  Globe, 
  Flag, 
  ClipboardCheck, 
  Building2,
  LogOut,
  Settings,
  Users
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "firebase/auth";

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, auth, firestore } = useFirebase();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (e) {
        console.error("Error fetching role:", e);
      }
    }
    fetchProfile();
  }, [user, firestore]);

  useEffect(() => {
    async function findId() {
      if (!user || !firestore) return;
      try {
        const q = query(collection(firestore, "all_players_index"), where("email", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPlayerInfo(snap.docs[0].data());
        }
      } catch (e) {
        console.error("Error finding player info:", e);
      }
    }
    findId();
  }, [user, firestore]);

  const pendingCallupsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    return query(
      collection(firestore, "match_callups"), 
      where("playerId", "==", playerInfo.id),
      where("status", "==", "pending"),
      where("published", "==", true)
    );
  }, [firestore, playerInfo]);

  const { data: pendingCallups } = useCollection(pendingCallupsQuery);
  const pendingCount = pendingCallups?.length || 0;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) return null;

  const isCoach = userProfile?.role === 'coach';
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'fed_admin';
  const isPlayer = userProfile?.role === 'player' || (!isAdmin && !isCoach && playerInfo);

  return (
    <Sidebar className="border-r-0 shadow-sm" collapsible="icon">
      <SidebarHeader className="p-6">
        <Link href={isCoach ? "/dashboard/coach" : "/dashboard"} className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg group-hover:scale-110 transition-transform shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-black text-xl tracking-tighter leading-none truncate">SportsManager</span>
            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Platform</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        {/* SECCIÓN ADMIN: Solo para Administradores */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2">Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard Principal">
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="font-bold">Inicio Sistema</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/clubs") && !pathname.includes("/shop")} tooltip="Gestión de Clubes">
                    <Link href="/dashboard/clubs">
                      <Building2 className="h-4 w-4" />
                      <span className="font-bold">Clubes & Sedes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECCIÓN DEPORTISTA: Solo para Jugadores o Admins */}
        {(isPlayer || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2">Deportista</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player"} tooltip="Panel del Jugador">
                    <Link href="/dashboard/player">
                      <UserCircle className="h-4 w-4" />
                      <span className="font-bold">Panel del Jugador</span>
                    </Link>
                  </SidebarMenuButton>
                  {pendingCount > 0 && (
                    <SidebarMenuBadge className="bg-orange-500 text-white font-black text-[10px] h-5 min-w-[20px] rounded-full">
                      {pendingCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/id-card"} tooltip="Carnet Digital">
                    <Link href="/dashboard/player/id-card">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="font-bold">Carnet Digital</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECCIÓN STAFF: Para Entrenadores, Coaches y Admins */}
        {(isCoach || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2">Staff Técnico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/coach"} tooltip="Mis Equipos">
                    <Link href="/dashboard/coach">
                      <ClipboardCheck className="h-4 w-4" />
                      <span className="font-bold">Panel de Entrenamiento</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* Herramientas adicionales permitidas para coach */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/search"} tooltip="Búsqueda Jugadoras">
                    <Link href="/dashboard/player/search">
                      <Users className="h-4 w-4" />
                      <span className="font-bold">Base de Jugadoras</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECCIÓN ECOSISTEMA: Solo Admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2">Ecosistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="opacity-60" tooltip="Federaciones">
                    <Link href="/dashboard/federations">
                      <Globe className="h-4 w-4" />
                      <span className="font-bold">Federaciones</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="opacity-60" tooltip="Arbitraje">
                    <Link href="/dashboard/referee">
                      <Flag className="h-4 w-4" />
                      <span className="font-bold">Arbitraje</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          {user && (
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-2xl border border-white shadow-sm overflow-hidden group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:shadow-none">
              <Avatar className="h-8 w-8 border-2 border-primary/10 shrink-0">
                <AvatarImage src={userProfile?.photoUrl} />
                <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black uppercase">{user.email?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-[10px] font-black truncate text-foreground">{userProfile?.name || user.email}</span>
                <span className="text-[8px] uppercase text-primary font-black tracking-widest">{userProfile?.role || 'Socio'}</span>
              </div>
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10" tooltip="Cerrar Sesión">
                <LogOut className="h-4 w-4" />
                <span className="font-bold">Cerrar Sesión</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
