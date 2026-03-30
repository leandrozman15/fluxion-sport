
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Trophy, 
  UserCircle, 
  ShieldCheck, 
  ClipboardCheck, 
  Building2,
  LogOut,
  Search,
  Layers,
  Briefcase,
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
} from "@/components/ui/sidebar";
import { useFirebase } from "@/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOut } from "firebase/auth";

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, auth, firestore } = useFirebase();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (e) { console.error(e); }
    }
    fetchProfile();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!mounted) return null;

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'club_admin';
  const isCoordinator = userProfile?.role === 'coordinator' || isAdmin;
  const isCoach = userProfile?.role === 'coach' || isAdmin;
  const isPlayer = userProfile?.role === 'player' || isAdmin;

  return (
    <Sidebar className="border-r-0 shadow-sm" collapsible="icon">
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg group-hover:scale-110 transition-transform shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-black text-xl tracking-tighter leading-none truncate text-foreground">Fluxion Sport</span>
            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Club Edition</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        {/* SECCIÓN ADMINISTRADOR / COORDINADOR */}
        {(isCoordinator) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-primary">Gestión Institucional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/clubs")} tooltip="Dashboard Club">
                    <Link href={userProfile?.clubId ? `/dashboard/clubs/${userProfile.clubId}` : "/dashboard"}>
                      <Building2 className="h-4 w-4" />
                      <span className="font-bold">Panel Institucional</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/divisions")} tooltip="Categorías">
                    <Link href={userProfile?.clubId ? `/dashboard/clubs/${userProfile.clubId}/divisions` : "/dashboard"}>
                      <Layers className="h-4 w-4" />
                      <span className="font-bold">Categorías & Ramas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/players")} tooltip="Jugadores">
                    <Link href={userProfile?.clubId ? `/dashboard/clubs/${userProfile.clubId}/players` : "/dashboard"}>
                      <Users className="h-4 w-4" />
                      <span className="font-bold">Padrón de Socios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECCIÓN ENTRENADOR */}
        {(isCoach) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-blue-600">Área Técnica</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/coach"} tooltip="Mis Equipos">
                    <Link href="/dashboard/coach">
                      <ClipboardCheck className="h-4 w-4" />
                      <span className="font-bold">Pizarra Táctica</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECCIÓN JUGADOR */}
        {(isPlayer) && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-green-600">Mi Espacio</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player"} tooltip="Mi Hub">
                    <Link href="/dashboard/player">
                      <UserCircle className="h-4 w-4" />
                      <span className="font-bold">Mi Perfil</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/id-card"} tooltip="Carnet Digital">
                    <Link href="/dashboard/player/id-card">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="font-bold">Credencial</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10" tooltip="Cerrar Sesión">
              <LogOut className="h-4 w-4" />
              <span className="font-bold">Salir de la App</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
