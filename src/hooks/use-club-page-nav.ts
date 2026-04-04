"use client";

import { useMemo } from "react";
import {
  Trophy,
  FileText,
  Shield,
  CalendarDays,
  Layers,
  UserRound,
  CreditCard,
  ShieldCheck,
  LayoutDashboard,
  ShoppingBag,
  Users,
} from "lucide-react";
import { doc } from "firebase/firestore";
import { useFirestore, useDoc, useMemoFirebase, useFirebase } from "@/firebase";

export function useClubPageNav(clubId: string) {
  const { user } = useFirebase();
  const db = useFirestore();

  const userRef = useMemoFirebase(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user]
  );
  const { data: profile } = useDoc(userRef);

  const isCoordinator = profile?.role === "coordinator";
  const isCoach = profile?.role === "coach" || profile?.role === "coach_lvl1" || profile?.role === "coach_lvl2";

  const nav = useMemo(() => {
    if (isCoach) {
      return [
        { title: "Mi Panel", href: "/dashboard/coach", icon: Trophy },
        { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
        { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
        { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop`, icon: ShoppingBag },
      ];
    }

    if (isCoordinator) {
      return [
        { title: "Dashboard", href: "/dashboard/coordinator", icon: Trophy },
        { title: "Padrón Socios", href: `/dashboard/clubs/${clubId}/players`, icon: FileText },
        { title: "Rivales", href: `/dashboard/clubs/${clubId}/opponents`, icon: Shield },
        { title: "Gestor Fixture", href: `/dashboard/clubs/${clubId}/fixture`, icon: CalendarDays },
        { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
        { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
        { title: "Tesorería", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
        { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
      ];
    }
    return [
      { title: "Panel General", href: `/dashboard/clubs/${clubId}`, icon: LayoutDashboard },
      { title: "Categorías", href: `/dashboard/clubs/${clubId}/divisions`, icon: Layers },
      { title: "Staff Técnico", href: `/dashboard/clubs/${clubId}/coaches`, icon: UserRound },
      { title: "Tienda Club", href: `/dashboard/clubs/${clubId}/shop/admin`, icon: ShoppingBag },
      { title: "Base Jugadores", href: `/dashboard/clubs/${clubId}/players`, icon: Users },
      { title: "Finanzas", href: `/dashboard/clubs/${clubId}/finances`, icon: CreditCard },
      { title: "Mi Carnet", href: "/dashboard/player/id-card", icon: ShieldCheck },
    ];
  }, [isCoach, isCoordinator, clubId]);

  return nav;
}
