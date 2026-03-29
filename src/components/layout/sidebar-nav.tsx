"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function SidebarNav() {
  const pathname = usePathname();
  const { user, firestore } = useFirebase();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = useState<any>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user || !firestore) return;
      try {
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } catch (e) {
        console.error("Error fetching role:", e);
      }
    }
    fetchRole();
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

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="bg-primary p-2 rounded-lg text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight">SportsManager</span>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Acceso Principal al Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Inicio Sistema</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/dashboard/clubs") && !pathname.includes("/shop")}>
                  <Link href="/dashboard/clubs">
                    <Building2 className="h-4 w-4" />
                    <span>Gestión de Clubes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Panel del Jugador - Siempre visible durante el prototipado */}
        <SidebarGroup>
          <SidebarGroupLabel>Mi Perfil Deportivo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/player"}>
                  <Link href="/dashboard/player">
                    <UserCircle className="h-4 w-4" />
                    <span>Panel del Jugador</span>
                  </Link>
                </SidebarMenuButton>
                {pendingCount > 0 && (
                  <SidebarMenuBadge className="bg-orange-500 text-white font-bold">
                    {pendingCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/id-card"}>
                  <Link href="/dashboard/player/id-card">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Mi Carnet Digital</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/player/payments"}>
                  <Link href="/dashboard/player/payments">
                    <CreditCard className="h-4 w-4" />
                    <span>Pagos & Cuotas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Staff Técnico */}
        <SidebarGroup>
          <SidebarGroupLabel>Cuerpo Técnico</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard/coach"}>
                  <Link href="/dashboard/coach">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Mis Equipos</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ecosistema Externo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-60">
                  <Link href="/dashboard/federations">
                    <Globe className="h-4 w-4" />
                    <span>CAH & Federaciones</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="opacity-60">
                  <Link href="/dashboard/referee">
                    <Flag className="h-4 w-4" />
                    <span>Arbitraje & Ligas</span>
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
                <span className="text-[8px] uppercase text-primary font-black">{userRole || 'Socio'}</span>
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}