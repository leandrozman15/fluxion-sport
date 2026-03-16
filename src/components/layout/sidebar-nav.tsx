
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
  FileText,
  BarChart3,
  CheckCircle2,
  Bell,
  Search,
  UserRound,
  Layers,
  ArrowRightLeft,
  Stethoscope
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
  SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export function SidebarNav() {
  const pathname = usePathname();
  const { user, firestore } = useFirebase();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = useState<any>(null);

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

  useEffect(() => {
    async function findId() {
      if (userRole === 'player' || !userRole) {
        if (!user || !firestore) return;
        const q = query(collection(firestore, "all_players_index"), where("email", "==", user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPlayerInfo(snap.docs[0].data());
        }
      }
    }
    findId();
  }, [user, firestore, userRole]);

  const pendingCallupsQuery = useMemoFirebase(() => {
    if (!firestore || !playerInfo) return null;
    return query(
      collection(firestore, "match_callups"), 
      where("playerId", "==", playerInfo.id),
      where("status", "==", "pending")
    );
  }, [firestore, playerInfo]);

  const { data: pendingCallups } = useCollection(pendingCallupsQuery);
  const pendingCount = pendingCallups?.length || 0;

  const isAdmin = (role: string | null) => ['admin', 'club_admin'].includes(role || '');
  const isPlayer = (role: string | null) => role === 'player' || role === 'admin' || !role;

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="bg-primary p-2 rounded-lg text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight">SportsManager</span>
      </SidebarHeader>
      
      <SidebarContent>
        {/* ENFOQUE PRINCIPAL: GESTIÓN DEL CLUB */}
        <SidebarGroup>
          <SidebarGroupLabel>Mi Institución</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/clubs")}>
                  <Link href="/dashboard/clubs">
                    <Building2 className="h-4 w-4" />
                    <span>Panel de Clubes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/coach">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Cuerpo Técnico</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/player/search">
                    <Search className="h-4 w-4" />
                    <span>Padrón de Jugadores</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* PERFIL DEL JUGADOR */}
        {isPlayer(userRole) && (
          <SidebarGroup>
            <SidebarGroupLabel>Mi Perfil Deportivo</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/player"}>
                    <Link href="/dashboard/player">
                      <Contact2 className="h-4 w-4" />
                      <span>Mi Ficha & Convocatorias</span>
                    </Link>
                  </SidebarMenuButton>
                  {pendingCount > 0 && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
                      {pendingCount}
                    </SidebarMenuBadge>
                  )}
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

        {/* ECOSISTEMA EXTERNO (AISLADO / SUSPENDIDO MOMENTANEAMENTE) */}
        <SidebarGroup>
          <SidebarGroupLabel>Ecosistema Externo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                  <Link href="/dashboard/federations">
                    <Globe className="h-4 w-4" />
                    <span>CAH & Federaciones</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                  <Link href="/dashboard/referee">
                    <Flag className="h-4 w-4" />
                    <span>Arbitraje & Ligas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                  <Link href="/dashboard/staff">
                    <UserCog className="h-4 w-4" />
                    <span>Gestión de Sistema</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
