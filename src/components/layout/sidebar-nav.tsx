
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
  Layers,
  Users,
  CreditCard,
  ShoppingBag
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

  const clubId = userProfile?.clubId;

  return (
    <Sidebar className="border-r-0 shadow-sm" collapsible="icon">
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg group-hover:scale-110 transition-transform shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-black text-xl tracking-tighter leading-none truncate text-foreground">Fluxion Sport</span>
            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Club Manager</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        {/* SECCIÓN ADMINISTRADOR / COORDINADOR */}
        {isCoordinator && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-primary">Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes(`/clubs/${clubId}`)} tooltip="Panel Club">
                    <Link href={clubId ? `/dashboard/clubs/${clubId}` : "/dashboard"}>
                      <Building2 className="h-4 w-4" />
                      <span className="font-bold">Panel Institucional</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/divisions")} tooltip="Categorías">
                    <Link href={clubId ? `/dashboard/clubs/${clubId}/divisions` : "/dashboard"}>
                      <Layers className="h-4 w-4" />
                      <span className="font-bold">Categorías</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/players")} tooltip="Socios">
                    <Link href={clubId ? `/dashboard/clubs/${clubId}/players` : "/dashboard"}>
                      <Users className="h-4 w-4" />
                      <span className="font-bold">Padrón de Socios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/finances")} tooltip="Finanzas">
                    <Link href={clubId ? `/dashboard/clubs/${clubId}/finances` : "/dashboard"}>
                      <CreditCard className="h-4 w-4" />
                      <span className="font-bold">Tesorería</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* SECCIÓN ENTRENADOR */}
        {isCoach && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-blue-600">Área Técnica</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/coach"} tooltip="Mi Pizarra">
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
        {isPlayer && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-green-600">Mi Espacio</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player"} tooltip="Mi Perfil">
                    <Link href="/dashboard/player">
                      <UserCircle className="h-4 w-4" />
                      <span className="font-bold">Mi Hub</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/id-card"} tooltip="Carnet Digital">
                    <Link href="/dashboard/player/id-card">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="font-bold">Mi Credencial</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-100">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10" tooltip="Cerrar Sesión">
              <LogOut className="h-4 w-4" />
              <span className="font-bold">Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
