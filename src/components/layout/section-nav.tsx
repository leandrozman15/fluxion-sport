
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
}

interface SectionNavProps {
  items: NavItem[];
  basePath: string;
}

export function SectionNav({ items, basePath }: SectionNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg w-fit mb-6 overflow-x-auto no-scrollbar max-w-full">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
              isActive 
                ? "bg-background text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.title}
          </Link>
        );
      })}
    </div>
  );
}
