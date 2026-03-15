
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Users, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Position {
  id: string;
  x: number;
  y: number;
  label: string;
}

export function HockeyTacticalBoard({ roster = [] }: { roster?: any[] }) {
  const [playerCount, setPlayerCount] = useState(11);
  const [positions, setPositions] = useState<Position[]>([]);

  // Generar posiciones iniciales basadas en el conteo
  useEffect(() => {
    const newPositions: Position[] = [];
    const rows = 4; // GK, DEF, MID, FWD
    
    // Arquera (GK)
    newPositions.push({ id: 'pos-gk', x: 50, y: 90, label: 'GK' });

    // Resto de jugadoras distribuidas
    const remaining = playerCount - 1;
    const defCount = Math.ceil(remaining * 0.35);
    const midCount = Math.ceil(remaining * 0.35);
    const fwdCount = remaining - defCount - midCount;

    // Defensas
    for (let i = 0; i < defCount; i++) {
      newPositions.push({ 
        id: `pos-df-${i}`, 
        x: (100 / (defCount + 1)) * (i + 1), 
        y: 75, 
        label: 'DF' 
      });
    }

    // Volantes
    for (let i = 0; i < midCount; i++) {
      newPositions.push({ 
        id: `pos-md-${i}`, 
        x: (100 / (midCount + 1)) * (i + 1), 
        y: 50, 
        label: 'MF' 
      });
    }

    // Delanteras
    for (let i = 0; i < fwdCount; i++) {
      newPositions.push({ 
        id: `pos-fw-${i}`, 
        x: (100 / (fwdCount + 1)) * (i + 1), 
        y: 25, 
        label: 'FW' 
      });
    }

    setPositions(newPositions);
  }, [playerCount]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <Card className="lg:col-span-8 overflow-hidden bg-muted/50 border-none shadow-none">
        <div className="relative w-full aspect-[2/3] max-w-lg mx-auto bg-[#2d5a27] rounded-xl border-[6px] border-white shadow-2xl overflow-hidden">
          {/* Field Texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)' }} />
          
          {/* Field Lines SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150">
            <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1" />
            <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
            
            {/* Area (D) Top */}
            <path d="M 20 0 Q 20 35 50 35 Q 80 35 80 0" fill="none" stroke="white" strokeWidth="1" />
            <line x1="45" y1="15" x2="55" y2="15" stroke="white" strokeWidth="1" /> {/* Penalty stroke mark */}
            
            {/* Area (D) Bottom */}
            <path d="M 20 150 Q 20 115 50 115 Q 80 115 80 150" fill="none" stroke="white" strokeWidth="1" />
            <line x1="45" y1="135" x2="55" y2="135" stroke="white" strokeWidth="1" />
            
            {/* Corner marks */}
            <circle cx="0" cy="0" r="2" fill="white" />
            <circle cx="100" cy="0" r="2" fill="white" />
            <circle cx="0" cy="150" r="2" fill="white" />
            <circle cx="100" cy="150" r="2" fill="white" />
          </svg>

          {/* Players */}
          {positions.map((p, idx) => {
            const player = roster[idx] || null;
            return (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move transition-all duration-500 ease-out"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                <div className="flex flex-col items-center group">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-xl bg-primary">
                      <AvatarImage src={player?.playerPhoto} />
                      <AvatarFallback className="text-white font-bold text-xs">{p.label}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent border-2 border-white flex items-center justify-center shadow-md">
                      <span className="text-[8px] font-black text-accent-foreground">
                        {player?.jerseyNumber || (idx + 1)}
                      </span>
                    </div>
                  </div>
                  <span className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-bold text-white whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {player?.playerName || `Posición ${idx + 1}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="lg:col-span-4 space-y-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Ajustes de Equipo
            </CardTitle>
            <CardDescription>Configura el esquema para esta sesión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-bold">Jugadoras en Campo</Label>
                <span className="text-2xl font-black text-primary">{playerCount}</span>
              </div>
              <Slider 
                value={[playerCount]} 
                min={5} 
                max={11} 
                step={1} 
                onValueChange={(v) => setPlayerCount(v[0])}
                className="py-4"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                <span>Pista (5)</span>
                <span>Seven (7)</span>
                <span>Campo (11)</span>
              </div>
            </div>

            <div className="pt-4 border-t border-primary/10">
              <h4 className="text-xs font-black uppercase text-muted-foreground mb-4">Instrucciones</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Arrastra las jugadoras para ajustar el dibujo táctico.</li>
                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Usa el slider para cambiar el tipo de partido.</li>
                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Los cambios son visuales para esta sesión.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase">Plantilla Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {roster.map((player: any) => (
                <div key={player.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={player.playerPhoto} />
                      <AvatarFallback>{player.playerName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{player.playerName}</span>
                  </div>
                  <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                </div>
              ))}
              {roster.length === 0 && <p className="text-center py-4 text-muted-foreground italic">Asigna jugadoras al equipo.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
