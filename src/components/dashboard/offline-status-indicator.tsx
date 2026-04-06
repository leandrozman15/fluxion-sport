"use client";

import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SyncStatus } from "@/hooks/use-sync-engine";

interface OfflineStatusIndicatorProps {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
  storageWarning?: boolean;
  onForceSync: () => void;
}

export function OfflineStatusIndicator({
  isOnline,
  syncStatus,
  pendingCount,
  lastSyncAt,
  lastError,
  storageWarning,
  onForceSync,
}: OfflineStatusIndicatorProps) {
  const getIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus === "syncing") return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncStatus === "error") return <CloudOff className="h-4 w-4" />;
    if (syncStatus === "pending") return <Cloud className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getColor = (): string => {
    if (!isOnline) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (syncStatus === "error") return "bg-red-500/20 text-red-400 border-red-500/30";
    if (syncStatus === "syncing") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (syncStatus === "pending") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const getLabel = () => {
    if (!isOnline) return "Sin conexión";
    if (syncStatus === "syncing") return "Sincronizando...";
    if (syncStatus === "error") return "Error de sync";
    if (syncStatus === "pending") return `${pendingCount} pendiente${pendingCount > 1 ? "s" : ""}`;
    return "Sincronizado";
  };

  const getTooltip = () => {
    const parts: string[] = [];
    if (!isOnline) parts.push("Modo offline — los datos se guardan localmente");
    if (syncStatus === "error" && lastError) parts.push(`Error: ${lastError}`);
    if (pendingCount > 0) parts.push(`${pendingCount} operación(es) pendiente(s)`);
    if (lastSyncAt) parts.push(`Última sync: ${lastSyncAt.toLocaleTimeString()}`);
    if (storageWarning) parts.push("⚠️ Almacenamiento bajo (<50MB)");
    return parts.join("\n") || "Conectado y sincronizado";
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                getColor()
              )}
            >
              {getIcon()}
              <span className="hidden sm:inline">{getLabel()}</span>
              {pendingCount > 0 && syncStatus !== "syncing" && (
                <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px] whitespace-pre-line">
            {getTooltip()}
          </TooltipContent>
        </Tooltip>

        {storageWarning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-4 w-4 text-amber-400 animate-pulse" />
            </TooltipTrigger>
            <TooltipContent>Almacenamiento bajo — sincroniza pronto</TooltipContent>
          </Tooltip>
        )}

        {isOnline && pendingCount > 0 && syncStatus !== "syncing" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onForceSync}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
