"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin",
  fed_admin: "Admin Federación",
  club_admin: "Director Club",
  coordinator: "Coordinador",
  coach_lvl1: "Entrenador Nivel 1",
  coach_lvl2: "Entrenador Nivel 2",
  coach: "Staff Técnico",
  player: "Jugador/a",
};

function getRoleDashboardPath(role: string, clubId?: string): string {
  switch (role) {
    case "admin":
    case "fed_admin":
      return "/dashboard/superadmin";
    case "club_admin":
      return clubId ? `/dashboard/clubs/${clubId}` : "/dashboard";
    case "coordinator":
      return "/dashboard/coordinator";
    case "coach_lvl1":
    case "coach_lvl2":
    case "coach":
      return "/dashboard/coach";
    case "player":
    default:
      return "/dashboard/player";
  }
}

interface ActiveRoleContextType {
  roles: string[];
  activeRole: string | null;
  setActiveRole: (role: string) => void;
  switchRole: (role: string) => void;
  loading: boolean;
  profile: any;
  getRoleLabel: (role: string) => string;
  getRolePath: (role: string) => string;
}

const ActiveRoleContext = createContext<ActiveRoleContextType>({
  roles: [],
  activeRole: null,
  setActiveRole: () => {},
  switchRole: () => {},
  loading: true,
  profile: null,
  getRoleLabel: (r) => r,
  getRolePath: () => "/dashboard",
});

export const useActiveRole = () => useContext(ActiveRoleContext);

export function ActiveRoleProvider({ children }: { children: ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();
  const [roles, setRoles] = useState<string[]>([]);
  const [activeRole, setActiveRoleState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function detectRoles() {
      if (isUserLoading) return;
      if (!user || !firestore) {
        setLoading(false);
        return;
      }

      try {
        const detectedRoles: string[] = [];
        let profileData: any = null;

        const staffSnap = await getDoc(doc(firestore, "users", user.uid));
        if (staffSnap.exists()) {
          const data = staffSnap.data();
          profileData = data;
          if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
            for (const r of data.roles) {
              if (!detectedRoles.includes(r)) detectedRoles.push(r);
            }
          } else if (data.role) {
            detectedRoles.push(data.role);
          }
        }

        const playerSnap = await getDoc(doc(firestore, "all_players_index", user.uid));
        if (playerSnap.exists()) {
          if (!detectedRoles.includes("player")) {
            detectedRoles.push("player");
          }
          if (!profileData) {
            profileData = { ...playerSnap.data(), role: "player" };
          }
        }

        setRoles(detectedRoles);
        setProfile(profileData);

        const storageKey = `fluxion_active_role_${user.uid}`;
        const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;

        if (saved && detectedRoles.includes(saved)) {
          setActiveRoleState(saved);
        } else if (detectedRoles.length > 0) {
          setActiveRoleState(detectedRoles[0]);
        }
      } catch (e) {
        console.error("Error detecting roles:", e);
      } finally {
        setLoading(false);
      }
    }

    detectRoles();
  }, [user, firestore, isUserLoading]);

  const setActiveRole = useCallback(
    (role: string) => {
      setActiveRoleState(role);
      if (user && typeof window !== "undefined") {
        localStorage.setItem(`fluxion_active_role_${user.uid}`, role);
      }
    },
    [user]
  );

  const switchRole = useCallback(
    (role: string) => {
      setActiveRole(role);
      const path = getRoleDashboardPath(role, profile?.clubId);
      router.push(path);
    },
    [setActiveRole, router, profile]
  );

  const getRoleLabel = useCallback((role: string) => ROLE_LABELS[role] || role, []);
  const getRolePath = useCallback((role: string) => getRoleDashboardPath(role, profile?.clubId), [profile]);

  return (
    <ActiveRoleContext.Provider
      value={{ roles, activeRole, setActiveRole, switchRole, loading, profile, getRoleLabel, getRolePath }}
    >
      {children}
    </ActiveRoleContext.Provider>
  );
}
