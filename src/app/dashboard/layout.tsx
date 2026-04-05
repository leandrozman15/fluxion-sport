"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserProfileHeader } from "@/components/layout/user-profile-header";
import { ActiveRoleProvider } from "@/contexts/active-role-context";
import { useFirebase } from "@/firebase";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, firestore } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkRole() {
      if (!user || !firestore) return;
      try {
        const docSnap = await getDoc(doc(firestore, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const userRoles = data.roles && Array.isArray(data.roles) ? data.roles : [data.role].filter(Boolean);
          setIsAdmin(userRoles.includes('admin') || userRoles.includes('fed_admin'));
        }
      } catch (e) {
        console.error("Error validando permisos de sidebar:", e);
      }
    }
    checkRole();
  }, [user, firestore]);

  return (
    <ActiveRoleProvider>
      <SidebarProvider>
        {/* Solo el desarrollador/admin ve el menú lateral completo */}
        {isAdmin && <SidebarNav />}
        
        <SidebarInset className="bg-transparent border-none">
          <div className="relative flex flex-col min-h-screen">
            {/* Encabezado con Perfil y Salir visible para todos en la pantalla */}
            <UserProfileHeader />
            
            <main className="p-4 md:p-8 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-8">
              {children}
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ActiveRoleProvider>
  );
}
