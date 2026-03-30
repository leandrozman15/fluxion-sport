
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Users, GripVertical, RefreshCw, Save } from "lucide-react";
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

interface TacticalBoardProps {
  roster: any[];
  initialPlayerCount?: number;
  initialSport?: 'hockey' | 'rugby';
  onSettingsChange?: (settings: { playerCount: number; sport: 'hockey' | 'rugby' }) => void;
}

export function HockeyTacticalBoard({ 
  roster = [], 
  initialPlayerCount = 11, 
  initialSport = 'hockey',
  onSettingsChange 
}: TacticalBoardProps) {
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [sport, setSport] = useState<'hockey' | 'rugby'>(initialSport);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [draggingPosId, setDragPosId] = useState<string | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado interno con props iniciales si cambian (ej. al cargar de la DB)
  useEffect(() => {
    setPlayerCount(initialPlayerCount);
    setSport(initialSport);
  }, [initialPlayerCount, initialSport]);

  useEffect(() => {
    const newPositions: PositionSlot[] = [];
    
    if (sport === 'hockey') {
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
      const fwds = Math.ceil(playerCount * 0.5);
      const backs = playerCount - fwds;
      for (let i = 0; i < fwds; i++) {
        newPositions.push({ id: `pos-rug-f-${i}`, x: (100 / (fwds + 1)) * (i + 1), y: 60, label: 'FWD', assignedPlayerId: null });
      }
      for (let i = 0; i < backs; i++) {
        newPositions.push({ id: `pos-rug-b-${i}`, x: (100 / (backs + 1)) * (i + 1), y: 35, label: 'BCK', assignedPlayerId: null });
      }
    }

    // Mantener jugadores asignados si es posible
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

  const updateSettings = (newCount: number, newSport: 'hockey' | 'rugby') => {
    setPlayerCount(newCount);
    setSport(newSport);
    if (onSettingsChange) {
      onSettingsChange({ playerCount: newCount, sport: newSport });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <Card className="lg:col-span-8 overflow-hidden bg-transparent border-none shadow-none">
        <div 
          ref={fieldRef}
          className="relative w-full aspect-[2/3] max-w-lg mx-auto bg-[#1a3a0f] rounded-2xl border-[8px] border-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden cursor-crosshair"
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.05) 40px, rgba(255,255,255,0.05) 80px)' }} />
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150">
            {sport === 'hockey' ? (
              <>
                <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1" />
                <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" opacity="0.8" />
                <path d="M 15 0 Q 15 30 50 30 Q 85 30 85 0" fill="none" stroke="white" strokeWidth="1" />
                <path d="M 15 150 Q 15 120 50 120 Q 85 120 85 150" fill="none" stroke="white" strokeWidth="1" />
                <circle cx="50" cy="12" r="0.6" fill="white" />
                <circle cx="50" cy="138" r="0.6" fill="white" />
              </>
            ) : (
              <>
                <line x1="0" y1="15" x2="100" y2="15" stroke="white" strokeWidth="1.2" />
                <line x1="0" y1="135" x2="100" y2="135" stroke="white" strokeWidth="1.2" />
                <line x1="0" y1="40" x2="100" y2="40" stroke="white" strokeWidth="0.8" strokeDasharray="3,3" />
                <line x1="0" y1="110" x2="100" y2="110" stroke="white" strokeWidth="0.8" strokeDasharray="3,3" />
                <line x1="0" y1="65" x2="100" y2="65" stroke="white" strokeWidth="0.6" strokeDasharray="1,4" />
                <line x1="0" y1="85" x2="100" y2="85" stroke="white" strokeWidth="0.6" strokeDasharray="1,4" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1.5" />
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
                  draggingPosId === p.id ? "scale-125 z-50" : "z-10"
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseDown={() => setDragPosId(p.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnSlot(e, p.id)}
              >
                <div className="flex flex-col items-center group cursor-grab active:cursor-grabbing">
                  <div className="relative">
                    <Avatar className={cn(
                      "h-14 w-14 border-2 shadow-[0_8px_20px_rgba(0,0,0,0.4)] bg-white transition-colors",
                      player ? "border-primary" : "border-dashed border-white/40 bg-white/5"
                    )}>
                      <AvatarImage src={player?.playerPhoto} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-black opacity-50 bg-slate-100 text-slate-900">
                        {p.label}
                      </AvatarFallback>
                    </Avatar>
                    {player && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent border-2 border-white flex items-center justify-center shadow-md">
                        <span className="text-[10px] font-black text-accent-foreground">
                          {player.jerseyNumber || "•"}
                        </span>
                      </div>
                    )}
                  </div>
                  {player && (
                    <span className="mt-1 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black shadow-lg border border-white/20 whitespace-nowrap">
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
        <Card className="border-none bg-white shadow-2xl overflow-hidden">
          <CardHeader className="bg-slate-900 text-white pb-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <RefreshCw className="h-6 w-6 text-primary" /> Ajustes de Pizarra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-4">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-900">Campo de Juego</Label>
              <Tabs value={sport} onValueChange={(v: any) => updateSettings(playerCount, v)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1">
                  <TabsTrigger value="hockey" className="font-bold uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-primary">🏑 Hockey</TabsTrigger>
                  <TabsTrigger value="rugby" className="font-bold uppercase text-xs data-[state=active]:bg-white data-[state=active]:text-primary">🏉 Rugby</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <Label className="font-black text-xs uppercase tracking-widest text-slate-900">Jugadores en Cancha</Label>
                <div className="px-3 py-1 rounded-full bg-primary text-white font-black text-sm shadow-md">{playerCount}</div>
              </div>
              <Slider 
                value={[playerCount]} 
                min={5} 
                max={sport === 'rugby' ? 15 : 11} 
                step={1} 
                onValueChange={(v) => updateSettings(v[0], sport)}
                className="py-4"
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight text-center">Desliza para ajustar la formación</p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Banco de Jugadores (Suplentes)</p>
              <div className="max-h-[350px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {roster.map((player: any) => {
                  const isAssigned = positions.some(p => p.assignedPlayerId === player.playerId);
                  return (
                    <div 
                      key={player.id} 
                      draggable={!isAssigned}
                      onDragStart={(e) => onDragStartPlayer(e, player.playerId)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                        isAssigned 
                          ? "bg-slate-50 opacity-40 border-transparent grayscale" 
                          : "bg-white border-slate-100 shadow-sm hover:border-primary hover:shadow-lg cursor-grab active:cursor-grabbing"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border shadow-sm">
                          <AvatarImage src={player.playerPhoto} className="object-cover" />
                          <AvatarFallback className="font-bold text-slate-400">{player.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-900 leading-none">{player.playerName}</span>
                          {isAssigned && (
                            <span className="text-[9px] font-black text-primary mt-1.5 flex items-center gap-1 uppercase tracking-tighter">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin-slow" /> EN CAMPO
                            </span>
                          )}
                        </div>
                      </div>
                      {!isAssigned && <GripVertical className="h-5 w-5 text-slate-300 opacity-50" />}
                    </div>
                  );
                })}
                {roster.length === 0 && (
                  <div className="text-center py-10 text-slate-400 font-medium italic border-2 border-dashed rounded-2xl">
                    Sin jugadores asignados.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
