
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon, LogOut } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";

interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
}

interface SectionNavProps {
  items: NavItem[];
  basePath: string;
}

export function SectionNav({ items }: SectionNavProps) {
  const pathname = usePathname();
  const { auth } = useFirebase();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="hidden md:flex flex-col gap-3 bg-card/80 backdrop-blur-md border shadow-2xl p-2 rounded-2xl h-fit sticky top-8 animate-in slide-in-from-left duration-500 min-w-[64px] items-center">
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-col gap-3 w-full items-center">
          {items.map((item) => {
            const isReallyActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group",
                      isReallyActive 
                        ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                        : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {Icon && <Icon className={cn("h-5 w-5", isReallyActive ? "scale-110" : "group-hover:scale-110")} />}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold bg-primary text-primary-foreground border-none">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="w-8 h-px bg-slate-200 my-2" />

        {/* Salir integrado en la navegación de iconos */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-12 h-12 rounded-xl text-destructive hover:bg-red-50 transition-all duration-200 group"
            >
              <LogOut className="h-5 w-5 group-hover:scale-110" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold bg-destructive text-white border-none">
            Cerrar Sesión
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
