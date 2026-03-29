
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  return (
    <div className="hidden md:flex flex-col gap-3 bg-card/50 backdrop-blur-sm border shadow-sm p-2 rounded-2xl h-fit sticky top-8 animate-in slide-in-from-left duration-500">
      <TooltipProvider delayDuration={0}>
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
      </TooltipProvider>
    </div>
  );
}
