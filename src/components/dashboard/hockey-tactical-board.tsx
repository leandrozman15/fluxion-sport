
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  GripVertical, 
  RefreshCw, 
  Save, 
  Star, 
  Pencil, 
  Eraser, 
  Trash2, 
  CheckCircle2,
  FolderOpen,
  ChevronRight,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

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
  captainId?: string | null;
  teamId?: string;
  clubId?: string;
  divisionId?: string;
  onSettingsChange?: (settings: { playerCount: number; sport: 'hockey' | 'rugby' }) => void;
}

export function HockeyTacticalBoard({ 
  roster = [], 
  initialPlayerCount = 11, 
  initialSport = 'hockey',
  captainId = null,
  teamId,
  clubId,
  divisionId,
  onSettingsChange 
}: TacticalBoardProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [playerCount, setPlayerCount] = useState(initialPlayerCount);
  const [sport, setSport] = useState<'hockey' | 'rugby'>(initialSport);
  const [positions, setPositions] = useState<PositionSlot[]>([]);
  const [draggingPosId, setDragPosId] = useState<string | null>(null);
  
  // Drawing States
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'pen' | 'eraser' | null>(null);
  const [penColor, setPenColor] = useState('#3b82f6'); // primary
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Save State
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [tacticName, setSaveTacticName] = useState("");
  const [saving, setSaving] = useState(false);

  // Load Saved Tactics
  const tacticsQuery = useMemoFirebase(() => {
    if (!db || !clubId || !divisionId || !teamId) return null;
    return collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "tactics");
  }, [db, clubId, divisionId, teamId]);
  const { data: savedTactics, isLoading: tacticsLoading } = useCollection(tacticsQuery);

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

    roster.slice(0, playerCount).forEach((player, idx) => {
      if (newPositions[idx]) {
        newPositions[idx].assignedPlayerId = player.playerId;
      }
    });

    setPositions(newPositions);
  }, [playerCount, sport]);

  // Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode || !canvasRef.current) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = drawMode === 'eraser' ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawMode === 'eraser' ? '#1a3a0f' : penColor; // field green if eraser
    ctx.globalCompositeOperation = drawMode === 'eraser' ? 'destination-out' : 'source-over';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawMode) {
      draw(e);
      return;
    }
    if (!draggingPosId || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPositions(prev => prev.map(p => 
      p.id === draggingPosId ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
    ));
  };

  const handleMouseUp = () => {
    stopDrawing();
    setDragPosId(null);
  };

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

  const handleSaveTactic = async () => {
    if (!tacticName || !clubId || !divisionId || !teamId) return;
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const drawingData = canvas ? canvas.toDataURL() : "";
      
      const tacticId = doc(collection(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "tactics")).id;
      const tacticRef = doc(db, "clubs", clubId, "divisions", divisionId, "teams", teamId, "tactics", tacticId);

      await setDoc(tacticRef, {
        id: tacticId,
        name: tacticName,
        sport,
        playerCount,
        positions,
        drawingData,
        createdAt: new Date().toISOString()
      });

      toast({ title: "Táctica Guardada", description: `"${tacticName}" se ha añadido a la biblioteca.` });
      setIsSaveDialogOpen(false);
      setSaveTacticName("");
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
      setSaving(false);
    }
  };

  const loadTactic = (tactic: any) => {
    setSport(tactic.sport);
    setPlayerCount(tactic.playerCount);
    setPositions(tactic.positions);
    
    // Load drawing to canvas
    if (tactic.drawingData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(img, 0, 0);
      };
      img.src = tactic.drawingData;
    }
    toast({ title: "Táctica Cargada", description: tactic.name });
  };

  const deleteTactic = async (id: string) => {
    if (!confirm("¿Eliminar esta táctica?")) return;
    try {
      await deleteDoc(doc(db, "clubs", clubId!, "divisions", divisionId!, "teams", teamId!, "tactics", id));
      toast({ title: "Táctica Eliminada" });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 select-none" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <Card className="lg:col-span-8 overflow-hidden bg-transparent border-none shadow-none space-y-4">
        {/* Herramientas de Dibujo */}
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md p-3 rounded-2xl border shadow-xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <Button 
              variant={drawMode === 'pen' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setDrawMode(drawMode === 'pen' ? null : 'pen')}
              className="h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl"
            >
              <Pencil className="h-4 w-4" /> Dibujar
            </Button>
            <Button 
              variant={drawMode === 'eraser' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setDrawMode(drawMode === 'eraser' ? null : 'eraser')}
              className="h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl"
            >
              <Eraser className="h-4 w-4" /> Borrar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearCanvas}
              className="h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl text-destructive hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Limpiar
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {['#3b82f6', '#f97316', '#ef4444', '#ffffff'].map(color => (
              <button 
                key={color} 
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-all",
                  penColor === color ? "scale-125 border-slate-900 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                )}
                style={{ backgroundColor: color }}
                onClick={() => { setPenColor(color); setDrawMode('pen'); }}
              />
            ))}
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 px-6 font-black uppercase text-[10px] tracking-widest gap-2 rounded-xl shadow-lg">
                  <Save className="h-4 w-4" /> Guardar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Guardar Táctica</DialogTitle>
                  <DialogDescription className="font-bold text-slate-500">Asigna un nombre a esta configuración para usarla después.</DialogDescription>
                </DialogHeader>
                <div className="py-6 space-y-4">
                  <Label className="font-black text-xs uppercase text-slate-400">Nombre de la Jugada</Label>
                  <Input 
                    value={tacticName} 
                    onChange={e => setSaveTacticName(e.target.value)} 
                    placeholder="Ej. Salida de Fondo A..." 
                    className="h-14 border-2 font-bold text-lg"
                  />
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-8 border-t">
                  <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)} className="font-bold">Cancelar</Button>
                  <Button onClick={handleSaveTactic} disabled={saving || !tacticName} className="font-black uppercase text-xs tracking-widest h-12 px-10 shadow-xl">
                    {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Confirmar Guardado
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div 
          ref={fieldRef}
          className="relative w-full aspect-[2/3] max-w-lg mx-auto bg-[#1a3a0f] rounded-3xl border-[10px] border-white shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden"
          onMouseDown={drawMode ? startDrawing : undefined}
          onMouseMove={drawMode ? draw : handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={drawMode ? startDrawing : undefined}
          onTouchMove={drawMode ? draw : undefined}
          onTouchEnd={handleMouseUp}
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
              </>
            ) : (
              <>
                <line x1="0" y1="15" x2="100" y2="15" stroke="white" strokeWidth="1.2" />
                <line x1="0" y1="135" x2="100" y2="135" stroke="white" strokeWidth="1.2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1.5" />
              </>
            )}
          </svg>

          {/* Drawing Canvas Layer */}
          <canvas 
            ref={canvasRef}
            width={500} 
            height={750}
            className={cn(
              "absolute inset-0 w-full h-full z-20 pointer-events-none",
              drawMode && "pointer-events-auto cursor-crosshair"
            )}
          />

          {positions.map((p) => {
            const player = roster.find(r => r.playerId === p.assignedPlayerId);
            const isCaptain = p.assignedPlayerId === captainId;
            return (
              <div
                key={p.id}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-30",
                  draggingPosId === p.id ? "scale-125 z-50 shadow-2xl" : ""
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseDown={!drawMode ? () => setDragPosId(p.id) : undefined}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnSlot(e, p.id)}
              >
                <div className={cn("flex flex-col items-center group", !drawMode && "cursor-grab active:cursor-grabbing")}>
                  <div className="relative">
                    <Avatar className={cn(
                      "h-14 w-14 border-4 shadow-2xl bg-white transition-colors",
                      player ? (isCaptain ? "border-yellow-400 ring-4 ring-yellow-400/20" : "border-primary") : "border-dashed border-white/40 bg-white/5"
                    )}>
                      <AvatarImage src={player?.playerPhoto} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-black opacity-50 bg-slate-100 text-slate-900">
                        {p.label}
                      </AvatarFallback>
                    </Avatar>
                    {isCaptain && (
                      <div className="absolute -top-3 -left-3 h-7 w-7 rounded-xl bg-yellow-500 border-4 border-white flex items-center justify-center shadow-lg animate-bounce">
                        <span className="text-[10px] font-black text-white">C</span>
                      </div>
                    )}
                  </div>
                  {player && (
                    <span className={cn(
                      "mt-2 px-3 py-1 rounded-full text-[10px] font-black shadow-lg border border-white/20 whitespace-nowrap",
                      isCaptain ? "bg-yellow-500 text-white" : "bg-slate-900 text-white"
                    )}>
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
        <Card className="border-none bg-white shadow-2xl overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-slate-900 text-white pb-6">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" /> Tácticas Guardadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {tacticsLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
              ) : savedTactics?.length === 0 ? (
                <div className="text-center py-16 px-8 space-y-3 opacity-40">
                  <Save className="h-12 w-12 mx-auto text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin tácticas guardadas</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {savedTactics?.map((t: any) => (
                    <div key={t.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                      <button 
                        onClick={() => loadTactic(t)}
                        className="flex-1 text-left"
                      >
                        <p className="font-black text-slate-900 text-sm">{t.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{t.sport} • {t.playerCount} jug.</span>
                          <span className="text-[8px] font-bold text-primary uppercase">Hace {Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000)} días</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive rounded-lg" onClick={() => deleteTactic(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-2xl overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Ajustes Formación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-8">
            <div className="space-y-4">
              <Label className="font-black text-xs uppercase tracking-widest text-slate-900">Campo de Juego</Label>
              <Tabs value={sport} onValueChange={(v: any) => updateSettings(playerCount, v)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-12 bg-slate-100 p-1">
                  <TabsTrigger value="hockey" className="font-bold uppercase text-xs">🏑 Hockey</TabsTrigger>
                  <TabsTrigger value="rugby" className="font-bold uppercase text-xs">🏉 Rugby</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <Label className="font-black text-xs uppercase tracking-widest">En Cancha</Label>
                <div className="px-3 py-1 rounded-full bg-primary text-white font-black text-sm">{playerCount}</div>
              </div>
              <Slider 
                value={[playerCount]} 
                min={5} 
                max={sport === 'rugby' ? 15 : 11} 
                step={1} 
                onValueChange={(v) => updateSettings(v[0], sport)}
              />
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asignación de Jugadoras</p>
              <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
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
                          : "bg-white border-slate-100 shadow-sm hover:border-primary cursor-grab active:cursor-grabbing"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border shadow-sm">
                          <AvatarImage src={player.playerPhoto} className="object-cover" />
                          <AvatarFallback className="font-bold text-slate-400">{player.playerName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-black text-slate-900 leading-none">{player.playerName}</span>
                      </div>
                      {!isAssigned && <GripVertical className="h-4 w-4 text-slate-300 opacity-50" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
