
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Settings,
  Trophy,
  Users,
  ShieldCheck,
  Calendar,
  CreditCard,
  Contact2,
  UserCircle,
  Activity,
  Table as TableIcon,
  Globe,
  Flag,
  UserCog,
  ClipboardCheck,
  Building2,
  UserRoundSearch,
  Map,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// Definición de las "4 Puertas" del sistema
const systemNavItems = [
  { title: "Panel General", url: "/dashboard", icon: LayoutDashboard, roles: ['admin', 'fed_admin', 'club_admin', 'coach', 'referee', 'player'] },
  { title: "CAH / Sistema", url: "/dashboard/cah", icon: Database, roles: ['admin'] },
  { title: "Federaciones", url: "/dashboard/federations", icon: Globe, roles: ['admin', 'fed_admin'] },
  { title: "Instituciones", url: "/dashboard/clubs", icon: Building2, roles: ['admin', 'fed_admin', 'assoc_admin', 'club_admin'] },
  { title: "Jugadores", url: "/dashboard/player/search", icon: UserRoundSearch, roles: ['admin', 'fed_admin', 'club_admin'] },
];

const coachItems = [
  { title: "Mis Equipos", url: "/dashboard/coach", icon: ClipboardCheck },
];

const refereeItems = [
  { title: "Mis Partidos", url: "/dashboard/referee", icon: Flag },
];

const playerItems = [
  { title: "Mi Equipo", url: "/dashboard/player", icon: Trophy },
  { title: "Posiciones", url: "/dashboard/player/standings", icon: TableIcon },
  { title: "Estadísticas", url: "/dashboard/player/stats", icon: Activity },
  { title: "Mi Carnet", url: "/dashboard/player/id-card", icon: Contact2 },
  { title: "Mensualidades", url: "/dashboard/player/payments", icon: CreditCard },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, firestore } = useFirebase();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user || !firestore) return;
      const userDoc = await getDoc(doc(firestore, "users", user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
    }
    fetchRole();
  }, [user, firestore]);

  const canSee = (roles?: string[]) => {
    if (!roles) return true;
    return userRole && roles.includes(userRole);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="bg-primary p-2 rounded-lg text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight">SportsManager</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Sistema Nacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.filter(item => canSee(item.roles)).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + "/")}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === 'admin' || userRole === 'fed_admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestión Regional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/staff"}>
                    <Link href="/dashboard/staff">
                      <UserCog className="h-4 w-4" />
                      <span>Staff / Árbitros</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(userRole === 'coach' || userRole === 'club_admin' || userRole === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Cuerpo Técnico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {coachItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(userRole === 'referee' || userRole === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Oficiales</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {refereeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(userRole === 'player' || !userRole) && (
          <SidebarGroup>
            <SidebarGroupLabel>Mi Perfil Deportivo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {playerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-lg">
              <UserCircle className="h-4 w-4 text-primary" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold truncate max-w-[120px]">{user.email}</span>
                <span className="text-[8px] uppercase text-primary font-black">{userRole || 'Usuario'}</span>
              </div>
            </div>
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <Settings className="h-4 w-4" />
                <span>Configuración</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
