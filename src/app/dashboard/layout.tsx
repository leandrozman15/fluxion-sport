
"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserProfileHeader } from "@/components/layout/user-profile-header";
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
          const role = docSnap.data().role;
          setIsAdmin(role === 'admin' || role === 'fed_admin');
        }
      } catch (e) {
        console.error("Error validando permisos de sidebar:", e);
      }
    }
    checkRole();
  }, [user, firestore]);

  return (
    <SidebarProvider>
      {/* Solo el desarrollador/admin ve el menú lateral completo */}
      {isAdmin && <SidebarNav />}
      
      <SidebarInset className="bg-transparent border-none">
        <div className="relative flex flex-col min-h-screen">
          {/* Encabezado con Perfil y Salir visible para todos en la pantalla */}
          <UserProfileHeader />
          
          <main className="p-6 md:p-8 flex-1">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
