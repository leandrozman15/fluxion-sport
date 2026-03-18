
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Users, GripVertical, UserPlus, RefreshCw, Layers } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PositionSlot {
  id: string;
  x: number;
  y: number;
  label: string;
  assignedPlayerId: string | null;
}

export function HockeyTacticalBoard({ roster = [] }: { roster?: any[] }) {
  const [playerCount, setPlayerCount] = useState(11);
  const [sport, setSport] = useState<'hockey' | 'rugby'>('hockey');
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [draggingPosId, setDragPosId] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Inicializar posiciones tácticas estándar
  useEffect(() => {
    const newPositions: PositionSlot[] = [];
    
    if (sport === 'hockey') {
      // Arquera (GK)
      newPositions.push({ id: 'pos-gk', x: 50, y: 90, label: 'GK', assignedPlayerId: null });

      const remaining = playerCount - 1;
      const defCount = Math.ceil(remaining * 0.35);
      const midCount = Math.ceil(remaining * 0.35);
      const fwdCount = Math.max(0, remaining - defCount - midCount);

      for (let i = 0; i < defCount; i++) {
        newPositions.push({ id: `pos-df-${i}`, x: (100 / (defCount + 1)) * (i + 1), y: 70, label: 'DF', assignedPlayerId: null });
      }
      for (let i = 0; i < midCount; i++) {
        newPositions.push({ id: `pos-md-${i}`, x: (100 / (midCount + 1)) * (i + 1), y: 45, label: 'MF', assignedPlayerId: null });
      }
      for (let i = 0; i < fwdCount; i++) {
        newPositions.push({ id: `pos-fw-${i}`, x: (100 / (fwdCount + 1)) * (i + 1), y: 20, label: 'FW', assignedPlayerId: null });
      }
    } else {
      // RUGBY (Distribución simplificada)
      const fwds = Math.ceil(playerCount * 0.5);
      const backs = playerCount - fwds;

      for (let i = 0; i < fwds; i++) {
        newPositions.push({ id: `pos-rug-f-${i}`, x: (100 / (fwds + 1)) * (i + 1), y: 60, label: 'FWD', assignedPlayerId: null });
      }
      for (let i = 0; i < backs; i++) {
        newPositions.push({ id: `pos-rug-b-${i}`, x: (100 / (backs + 1)) * (i + 1), y: 35, label: 'BCK', assignedPlayerId: null });
      }
    }

    // Intentar auto-asignar jugadoras si ya hay en el roster
    roster.slice(0, playerCount).forEach((player, idx) => {
      if (newPositions[idx]) {
        newPositions[idx].assignedPlayerId = player.playerId;
      }
    });

    setPositions(newPositions);
  }, [playerCount, sport]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPosId || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPositions(prev => prev.map(p => 
      p.id === draggingPosId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
    ));
  };

  const handleMouseUp = () => setDragPosId(null);

  const onDragStartPlayer = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
  };

  const onDropOnSlot = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;
    setPositions(prev => {
      const cleaned = prev.map(p => p.assignedPlayerId === playerId ? { ...p, assignedPlayerId: null } : p);
      return cleaned.map(p => p.id === slotId ? { ...p, assignedPlayerId: playerId } : p);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <Card className="lg:col-span-8 overflow-hidden bg-muted/50 border-none shadow-none">
        <div 
          ref={fieldRef}
          className="relative w-full aspect-[2/3] max-w-lg mx-auto bg-[#244d1f] rounded-xl border-[6px] border-white shadow-2xl overflow-hidden cursor-crosshair"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }} />
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150">
            {sport === 'hockey' ? (
              <>
                <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.8" />
                <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.8" opacity="0.5" />
                <path d="M 15 0 Q 15 30 50 30 Q 85 30 85 0" fill="none" stroke="white" strokeWidth="0.8" />
                <path d="M 15 150 Q 15 120 50 120 Q 85 120 85 150" fill="none" stroke="white" strokeWidth="0.8" />
                <circle cx="50" cy="12" r="0.4" fill="white" />
                <circle cx="50" cy="138" r="0.4" fill="white" />
              </>
            ) : (
              <>
                {/* Rugby Markings */}
                <line x1="0" y1="15" x2="100" y2="15" stroke="white" strokeWidth="1" /> {/* Try Line */}
                <line x1="0" y1="135" x2="100" y2="135" stroke="white" strokeWidth="1" /> {/* Try Line */}
                <line x1="0" y1="40" x2="100" y2="40" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" /> {/* 22m */}
                <line x1="0" y1="110" x2="100" y2="110" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" /> {/* 22m */}
                <line x1="0" y1="65" x2="100" y2="65" stroke="white" strokeWidth="0.5" strokeDasharray="1,3" /> {/* 10m */}
                <line x1="0" y1="85" x2="100" y2="85" stroke="white" strokeWidth="0.5" strokeDasharray="1,3" /> {/* 10m */}
                <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1.2" /> {/* Halfway */}
                <line x1="5" y1="15" x2="5" y2="135" stroke="white" strokeWidth="0.3" strokeDasharray="1,4" />
                <line x1="95" y1="15" x2="95" y2="135" stroke="white" strokeWidth="0.3" strokeDasharray="1,4" />
              </>
            )}
          </svg>

          {positions.map((p) => {
            const player = roster.find(r => r.playerId === p.assignedPlayerId);
            return (
              <div
                key={p.id}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75",
                  draggingPosId === p.id ? "scale-110 z-50" : "z-10"
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseDown={() => setDragPosId(p.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnSlot(e, p.id)}
              >
                <div className="flex flex-col items-center group cursor-grab active:cursor-grabbing">
                  <div className="relative">
                    <Avatar className={cn(
                      "h-12 w-12 border-2 shadow-xl bg-background transition-colors",
                      player ? "border-primary" : "border-dashed border-white/40 bg-white/5"
                    )}>
                      <AvatarImage src={player?.playerPhoto} />
                      <AvatarFallback className="text-[10px] font-black opacity-50">
                        {p.label}
                      </AvatarFallback>
                    </Avatar>
                    {player && (
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent border-2 border-white flex items-center justify-center shadow-md">
                        <span className="text-[8px] font-black text-accent-foreground">
                          {player.jerseyNumber || "•"}
                        </span>
                      </div>
                    )}
                  </div>
                  {player && (
                    <span className="mt-1 px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded-full text-[9px] font-bold text-white whitespace-nowrap shadow-sm">
                      {player.playerName.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="lg:col-span-4 space-y-6">
        <Card className="border-primary/20 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Configuración Pizarra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tipo de Cancha</Label>
              <Tabs value={sport} onValueChange={(v: any) => {
                setSport(v);
                if (v === 'hockey' && playerCount > 11) setPlayerCount(11);
              }} className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="hockey">Hockey</TabsTrigger>
                  <TabsTrigger value="rugby">Rugby</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Fichas en Cancha</Label>
                <div className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-black text-[10px]">{playerCount}</div>
              </div>
              <Slider 
                value={[playerCount]} 
                min={5} 
                max={sport === 'rugby' ? 15 : 11} 
                step={1} 
                onValueChange={(v) => setPlayerCount(v[0])}
              />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border-t pt-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Banco de Jugadoras</p>
              {roster.map((player: any) => {
                const isAssigned = positions.some(p => p.assignedPlayerId === player.playerId);
                return (
                  <div 
                    key={player.id} 
                    draggable={!isAssigned}
                    onDragStart={(e) => onDragStartPlayer(e, player.playerId)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all",
                      isAssigned 
                        ? "bg-muted/50 opacity-50 border-transparent grayscale" 
                        : "bg-background hover:border-primary hover:shadow-md cursor-grab active:cursor-grabbing"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={player.playerPhoto} />
                        <AvatarFallback>{player.playerName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-none">{player.playerName}</span>
                        {isAssigned && (
                          <span className="text-[9px] font-medium text-primary mt-1 flex items-center gap-1">
                            <RefreshCw className="h-2 w-2" /> EN CANPO
                          </span>
                        )}
                      </div>
                    </div>
                    {!isAssigned && <GripVertical className="h-4 w-4 text-muted-foreground opacity-30" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
