
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Trophy, 
  Building2,
  LogOut,
  Layers,
  Users,
  CreditCard,
  ShoppingBag,
  UserRound,
  LayoutDashboard,
  ShieldAlert,
  Settings
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
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
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
        const docRef = doc(firestore, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        } else {
          // Fallback por email para registros no vinculados por UID
          const q = query(collection(firestore, "users"), where("email", "==", user.email?.toLowerCase().trim()));
          const snap = await getDocs(q);
          if (!snap.empty) setUserProfile(snap.docs[0].data());
        }
      } catch (e) { console.error("Error en sidebar:", e); }
    }
    fetchProfile();
  }, [user, firestore]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (!mounted) return null;

  const clubId = userProfile?.clubId;
  const isSuperAdmin = userProfile?.role === 'admin';

  return (
    <Sidebar className="border-r-0 shadow-sm" collapsible="icon">
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground shadow-lg group-hover:scale-110 transition-transform shrink-0">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="font-headline font-black text-xl tracking-tighter leading-none truncate text-foreground">Fluxion Sport</span>
            <span className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Institucional</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-red-600">Sistema Global</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/dashboard/superadmin"} tooltip="Super Admin">
                    <Link href="/dashboard/superadmin">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      <span className="font-bold text-red-600">Alta de Clientes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest px-4 mb-2 text-primary">Gestión Club</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/dashboard/clubs/${clubId}`} tooltip="Dashboard">
                  <Link href={clubId ? `/dashboard/clubs/${clubId}` : "/dashboard/clubs"}>
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="font-bold">Panel General</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/divisions")} tooltip="Categorías">
                  <Link href={clubId ? `/dashboard/clubs/${clubId}/divisions` : "/dashboard/clubs"}>
                    <Layers className="h-4 w-4" />
                    <span className="font-bold">Ramas y Categorías</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/players")} tooltip="Socios">
                  <Link href={clubId ? `/dashboard/clubs/${clubId}/players` : "/dashboard/clubs"}>
                    <Users className="h-4 w-4" />
                    <span className="font-bold">Padrón de Socios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/coaches")} tooltip="Staff">
                  <Link href={clubId ? `/dashboard/clubs/${clubId}/coaches` : "/dashboard/clubs"}>
                    <UserRound className="h-4 w-4" />
                    <span className="font-bold">Personal y Staff</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/finances")} tooltip="Tesorería">
                  <Link href={clubId ? `/dashboard/clubs/${clubId}/finances` : "/dashboard/clubs"}>
                    <CreditCard className="h-4 w-4" />
                    <span className="font-bold">Caja y Tesorería</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.includes("/shop")} tooltip="Tienda">
                  <Link href={clubId ? `/dashboard/clubs/${clubId}/shop/admin` : "/dashboard/clubs"}>
                    <ShoppingBag className="h-4 w-4" />
                    <span className="font-bold">Tienda Oficial</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
