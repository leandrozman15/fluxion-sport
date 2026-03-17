
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Users, GripVertical, UserPlus, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface PositionSlot {
  id: string;
  x: number;
  y: number;
  label: string;
  assignedPlayerId: string | null;
}

export function HockeyTacticalBoard({ roster = [] }: { roster?: any[] }) {
  const [playerCount, setPlayerCount] = useState(11);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [draggingPosId, setDragPosId] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Inicializar posiciones tácticas estándar
  useEffect(() => {
    const newPositions: PositionSlot[] = [];
    
    // Arquera (GK)
    newPositions.push({ id: 'pos-gk', x: 50, y: 90, label: 'GK', assignedPlayerId: null });

    const remaining = playerCount - 1;
    const defCount = Math.ceil(remaining * 0.35);
    const midCount = Math.ceil(remaining * 0.35);
    const fwdCount = remaining - defCount - midCount;

    // Distribución inicial sugerida
    for (let i = 0; i < defCount; i++) {
      newPositions.push({ 
        id: `pos-df-${i}`, 
        x: (100 / (defCount + 1)) * (i + 1), 
        y: 70, 
        label: 'DF',
        assignedPlayerId: null
      });
    }

    for (let i = 0; i < midCount; i++) {
      newPositions.push({ 
        id: `pos-md-${i}`, 
        x: (100 / (midCount + 1)) * (i + 1), 
        y: 45, 
        label: 'MF',
        assignedPlayerId: null
      });
    }

    for (let i = 0; i < fwdCount; i++) {
      newPositions.push({ 
        id: `pos-fw-${i}`, 
        x: (100 / (fwdCount + 1)) * (i + 1), 
        y: 20, 
        label: 'FW',
        assignedPlayerId: null
      });
    }

    // Intentar auto-asignar jugadoras si ya hay en el roster para que no empiece vacía
    roster.slice(0, playerCount).forEach((player, idx) => {
      if (newPositions[idx]) {
        newPositions[idx].assignedPlayerId = player.playerId;
      }
    });

    setPositions(newPositions);
  }, [playerCount]);

  // Manejo de movimiento libre de las fichas (Posiciones)
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

  // Lógica de Drag & Drop para asignar jugadoras a fichas
  const onDragStartPlayer = (e: React.DragEvent, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId);
  };

  const onDropOnSlot = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    if (!playerId) return;

    setPositions(prev => {
      // Si el jugador ya estaba en otro slot, lo quitamos de allí (evitar duplicados)
      const cleaned = prev.map(p => p.assignedPlayerId === playerId ? { ...p, assignedPlayerId: null } : p);
      // Asignamos al nuevo slot
      return cleaned.map(p => p.id === slotId ? { ...p, assignedPlayerId: playerId } : p);
    });
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <Card className="lg:col-span-8 overflow-hidden bg-muted/50 border-none shadow-none">
        <div 
          ref={fieldRef}
          className="relative w-full aspect-[2/3] max-w-lg mx-auto bg-[#244d1f] rounded-xl border-[6px] border-white shadow-2xl overflow-hidden cursor-crosshair"
        >
          {/* Textura de Césped */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }} />
          
          {/* Líneas de Campo */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150">
            <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.8" />
            <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.8" opacity="0.5" />
            <path d="M 15 0 Q 15 30 50 30 Q 85 30 85 0" fill="none" stroke="white" strokeWidth="0.8" />
            <path d="M 15 150 Q 15 120 50 120 Q 85 120 85 150" fill="none" stroke="white" strokeWidth="0.8" />
            <circle cx="50" cy="12" r="0.4" fill="white" />
            <circle cx="50" cy="138" r="0.4" fill="white" />
          </svg>

          {/* Fichas / Jugadoras */}
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
                onDragOver={allowDrop}
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

                    {!player && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-white/20" />
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
              <Users className="h-5 w-5 text-primary" /> Banco de Suplentes
            </CardTitle>
            <CardDescription className="text-xs">
              Arrastra una jugadora a una ficha del campo para asignarla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Sistema de Juego</Label>
                <Badge variant="outline" className="font-black">{playerCount} vs {playerCount}</Badge>
              </div>
              <Slider 
                value={[playerCount]} 
                min={5} 
                max={11} 
                step={1} 
                onValueChange={(v) => setPlayerCount(v[0])}
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                            <RefreshCw className="h-2 w-2" /> EN CAMPO
                          </span>
                        )}
                      </div>
                    </div>
                    {!isAssigned && <GripVertical className="h-4 w-4 text-muted-foreground opacity-30" />}
                  </div>
                );
              })}
              {roster.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed rounded-xl bg-muted/10">
                  <p className="text-muted-foreground text-xs italic">
                    Asigna jugadoras a la plantilla primero.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
          <h4 className="text-[10px] font-black uppercase text-primary mb-2 tracking-widest">Instrucciones</h4>
          <ul className="text-[10px] text-muted-foreground space-y-1.5 list-disc pl-3">
            <li><strong>Arrastrar Jugadora:</strong> Asigna identidad a una ficha.</li>
            <li><strong>Mover Ficha:</strong> Cambia la formación táctica libremente.</li>
            <li><strong>Sustitución:</strong> Suelta una jugadora sobre otra para cambiarla.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: any, className?: string }) {
  return (
    <div className={cn(
      "px-2 py-0.5 rounded text-[10px] font-bold",
      variant === 'outline' ? "border border-primary text-primary" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </div>
  );
}
