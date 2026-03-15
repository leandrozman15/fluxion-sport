
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
  Database,
  FileText,
  BarChart3,
  CheckCircle2,
  Bell
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

  const isAdmin = (role: string | null) => ['admin', 'fed_admin', 'assoc_admin', 'club_admin'].includes(role || '');
  const isCoach = (role: string | null) => ['coach', 'admin'].includes(role || '');
  const isReferee = (role: string | null) => ['referee', 'admin'].includes(role || '');
  const isPlayer = (role: string | null) => ['player', 'admin', null].includes(role); // null assumes guest/new player

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="bg-primary p-2 rounded-lg text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight">SportsManager</span>
      </SidebarHeader>
      
      <SidebarContent>
        {/* GRUPO 1: ADMINISTRACIÓN (Confederación / Federación / Club) */}
        {isAdmin(userRole) && (
          <SidebarGroup>
            <SidebarGroupLabel>Gestión Institucional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Panel Central</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/staff")}>
                    <Link href="/dashboard/staff">
                      <UserCog className="h-4 w-4" />
                      <span>Gestión de Usuarios</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/federations") || pathname.startsWith("/dashboard/clubs")}>
                    <Link href="/dashboard/clubs">
                      <Building2 className="h-4 w-4" />
                      <span>Estructura & Clubes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.includes("/tournaments")}>
                    <Link href="/dashboard/federations">
                      <Flag className="h-4 w-4" />
                      <span>Torneos & Fixture</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/cah">
                      <BarChart3 className="h-4 w-4" />
                      <span>Reportes & Auditoría</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* GRUPO 2: ENTRENADORES */}
        {isCoach(userRole) && (
          <SidebarGroup>
            <SidebarGroupLabel>Cuerpo Técnico</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/coach"}>
                    <Link href="/dashboard/coach">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Panel de Equipo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/coach">
                      <Bell className="h-4 w-4" />
                      <span>Convocatorias & Asistencia</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* GRUPO 3: ÁRBITROS */}
        {isReferee(userRole) && (
          <SidebarGroup>
            <SidebarGroupLabel>Oficiales de Mesa</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/referee"}>
                    <Link href="/dashboard/referee">
                      <FileText className="h-4 w-4" />
                      <span>Mis Partidos & Actas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/dashboard/referee">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Validación de Resultados</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* GRUPO 4: JUGADORES */}
        {isPlayer(userRole) && (
          <SidebarGroup>
            <SidebarGroupLabel>Mi Perfil Deportivo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player"}>
                    <Link href="/dashboard/player">
                      <Contact2 className="h-4 w-4" />
                      <span>Mi Ficha & Equipo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/stats"}>
                    <Link href="/dashboard/player/stats">
                      <Activity className="h-4 w-4" />
                      <span>Estadísticas & Goles</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/payments"}>
                    <Link href="/dashboard/player/payments">
                      <CreditCard className="h-4 w-4" />
                      <span>Cuotas & Mensualidades</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/id-card"}>
                    <Link href="/dashboard/player/id-card">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Carnet Digital</span>
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
