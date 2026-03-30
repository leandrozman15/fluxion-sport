
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
      const docSnap = await getDoc(doc(firestore, "users", user.uid));
      if (docSnap.exists() && (docSnap.data().role === 'admin' || docSnap.data().role === 'fed_admin')) {
        setIsAdmin(true);
      }
    }
    checkRole();
  }, [user, firestore]);

  return (
    <SidebarProvider>
      {/* Solo el desarrollador/admin ve el menú lateral completo */}
      {isAdmin && <SidebarNav />}
      <SidebarInset className="bg-transparent">
        <div className="relative flex flex-col min-h-screen">
          {/* Encabezado con Perfil y Salir visible para todos en la pantalla */}
          <UserProfileHeader />
          
          <div className="p-6 md:p-8 flex-1">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
