
"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Palette,
  Plus,
  UserX
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface PositionSlot {
  id: string;
  x: number;
  y: number;
  label: string;
  assignedPlayerId: string | null;
  type?: 'home' | 'away';
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
  const [rivals, setRivals] = useState<PositionSlot[]>([]);
  const [draggingId, setDraggingId] = useState<{ id: string, type: 'home' | 'away' } | null>(null);
  
  // Drawing States
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'pen' | 'eraser' | null>(null);
  const [penColor, setPenColor] = useState('#3b82f6'); 
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
      newPositions.push({ id: 'pos-gk', x: 50, y: 90, label: 'GK', assignedPlayerId: null, type: 'home' });
      const remaining = playerCount - 1;
      const defCount = Math.ceil(remaining * 0.35);
      const midCount = Math.ceil(remaining * 0.35);
      const fwdCount = Math.max(0, remaining - defCount - midCount);

      for (let i = 0; i < defCount; i++) {
        newPositions.push({ id: `pos-df-${i}`, x: (100 / (defCount + 1)) * (i + 1), y: 70, label: 'DF', assignedPlayerId: null, type: 'home' });
      }
      for (let i = 0; i < midCount; i++) {
        newPositions.push({ id: `pos-md-${i}`, x: (100 / (midCount + 1)) * (i + 1), y: 45, label: 'MF', assignedPlayerId: null, type: 'home' });
      }
      for (let i = 0; i < fwdCount; i++) {
        newPositions.push({ id: `pos-fw-${i}`, x: (100 / (fwdCount + 1)) * (i + 1), y: 20, label: 'FW', assignedPlayerId: null, type: 'home' });
      }
    } else {
      const fwds = Math.ceil(playerCount * 0.5);
      const backs = playerCount - fwds;
      for (let i = 0; i < fwds; i++) {
        newPositions.push({ id: `pos-rug-f-${i}`, x: (100 / (fwds + 1)) * (i + 1), y: 60, label: 'FWD', assignedPlayerId: null, type: 'home' });
      }
      for (let i = 0; i < backs; i++) {
        newPositions.push({ id: `pos-rug-b-${i}`, x: (100 / (backs + 1)) * (i + 1), y: 35, label: 'BCK', assignedPlayerId: null, type: 'home' });
      }
    }

    roster.slice(0, playerCount).forEach((player, idx) => {
      if (newPositions[idx]) {
        newPositions[idx].assignedPlayerId = player.playerId;
      }
    });

    setPositions(newPositions);
  }, [playerCount, sport]);

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
    ctx.strokeStyle = drawMode === 'eraser' ? '#1a3a0f' : penColor; 
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
    if (!draggingId || !fieldRef.current) return;
    const rect = fieldRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (draggingId.type === 'home') {
      setPositions(prev => prev.map(p => 
        p.id === draggingId.id ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
      ));
    } else {
      setRivals(prev => prev.map(p => 
        p.id === draggingId.id ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : p
      ));
    }
  };

  const handleMouseUp = () => {
    stopDrawing();
    setDraggingId(null);
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

  const addRivalMarker = () => {
    const newId = `rival-${Date.now()}`;
    setRivals(prev => [...prev, {
      id: newId,
      x: 50,
      y: 10,
      label: `R${prev.length + 1}`,
      assignedPlayerId: null,
      type: 'away'
    }]);
  };

  const deleteRivalMarker = (id: string) => {
    setRivals(prev => prev.filter(r => r.id !== id));
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
        rivals,
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
    setRivals(tactic.rivals || []);
    
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      <div className="lg:col-span-8 space-y-4">
        {/* Barra de Herramientas Compacta */}
        <div className="flex flex-wrap items-center justify-between bg-white p-3 rounded-2xl border shadow-xl gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border">
            <Button 
              variant={drawMode === 'pen' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setDrawMode(drawMode === 'pen' ? null : 'pen')}
              className="h-9 px-3 font-black uppercase text-[9px] tracking-widest gap-1.5 rounded-lg"
            >
              <Pencil className="h-3.5 w-3.5" /> Dibujar
            </Button>
            <Button 
              variant={drawMode === 'eraser' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setDrawMode(drawMode === 'eraser' ? null : 'eraser')}
              className="h-9 px-3 font-black uppercase text-[9px] tracking-widest gap-1.5 rounded-lg"
            >
              <Eraser className="h-3.5 w-3.5" /> Borrar
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearCanvas}
              className="h-9 px-3 font-black uppercase text-[9px] tracking-widest gap-1.5 rounded-lg text-destructive hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpiar
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-1 rounded-full">
              {['#3b82f6', '#f97316', '#ef4444', '#000000'].map(color => (
                <button 
                  key={color} 
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-all",
                    penColor === color && drawMode === 'pen' ? "scale-125 border-white shadow-md ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => { setPenColor(color); setDrawMode('pen'); }}
                />
              ))}
            </div>
            
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 px-4 font-black uppercase text-[9px] tracking-widest gap-2 rounded-xl shadow-lg bg-primary text-white">
                  <Save className="h-3.5 w-3.5" /> Guardar
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle className="font-black">Guardar en Biblioteca</DialogTitle>
                  <DialogDescription className="font-bold">Asigna un nombre a esta configuración táctica.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input 
                    value={tacticName} 
                    onChange={e => setSaveTacticName(e.target.value)} 
                    placeholder="Ej. Salida de Fondo Variante A" 
                    className="h-12 border-2 font-bold"
                  />
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 border-t mt-4">
                  <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)} className="font-bold">Cerrar</Button>
                  <Button onClick={handleSaveTactic} disabled={saving || !tacticName} className="font-black uppercase text-xs tracking-widest h-12 px-8">Confirmar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div 
          ref={fieldRef}
          className="relative w-full aspect-[2/3] max-w-md mx-auto bg-[#1a3a0f] rounded-[2.5rem] border-[10px] border-white shadow-2xl overflow-hidden"
          onMouseDown={drawMode ? startDrawing : undefined}
          onMouseMove={drawMode ? draw : handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={drawMode ? startDrawing : undefined}
          onTouchMove={drawMode ? draw : undefined}
          onTouchEnd={handleMouseUp}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 150">
            {sport === 'hockey' ? (
              <>
                <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="1" />
                <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="1" />
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

          <canvas 
            ref={canvasRef}
            width={500} 
            height={750}
            className={cn(
              "absolute inset-0 w-full h-full z-20 pointer-events-none",
              drawMode && "pointer-events-auto cursor-crosshair"
            )}
          />

          {/* Local Players */}
          {positions.map((p) => {
            const player = roster.find(r => r.playerId === p.assignedPlayerId);
            const isCaptain = p.assignedPlayerId === captainId;
            return (
              <div
                key={p.id}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-30",
                  draggingId?.id === p.id && draggingId?.type === 'home' ? "scale-125 z-50 shadow-2xl" : ""
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onMouseDown={!drawMode ? () => setDraggingId({ id: p.id, type: 'home' }) : undefined}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnSlot(e, p.id)}
              >
                <div className={cn("flex flex-col items-center group", !drawMode && "cursor-grab active:cursor-grabbing")}>
                  <div className="relative">
                    <Avatar className={cn(
                      "h-12 w-12 border-4 shadow-xl bg-white",
                      player ? (isCaptain ? "border-yellow-400" : "border-primary") : "border-dashed border-white/20 bg-white/5"
                    )}>
                      <AvatarImage src={player?.playerPhoto} className="object-cover" />
                      <AvatarFallback className="text-[10px] font-black opacity-50 bg-slate-100 text-slate-900">{p.label}</AvatarFallback>
                    </Avatar>
                    {isCaptain && (
                      <div className="absolute -top-2.5 -left-2.5 h-6 w-6 rounded-lg bg-yellow-500 border-2 border-white flex items-center justify-center shadow-lg font-black text-[10px] text-white">C</div>
                    )}
                  </div>
                  {player && (
                    <span className={cn(
                      "mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black shadow-lg border border-white/10 whitespace-nowrap",
                      isCaptain ? "bg-yellow-500 text-white" : "bg-slate-900 text-white"
                    )}>
                      {player.playerName.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Rival Players */}
          {rivals.map((r) => (
            <div
              key={r.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-40",
                draggingId?.id === r.id && draggingId?.type === 'away' ? "scale-125 z-50 shadow-2xl" : ""
              )}
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
              onMouseDown={!drawMode ? () => setDraggingId({ id: r.id, type: 'away' }) : undefined}
            >
              <div className="flex flex-col items-center group cursor-grab active:cursor-grabbing">
                <div className="relative">
                  <div className="h-10 w-10 border-4 border-accent bg-white rounded-full flex items-center justify-center shadow-xl font-black text-[10px] text-accent">
                    {r.label}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteRivalMarker(r.id); }}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50"
                  >
                    <UserX className="h-2 w-2" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <Card className="border-none bg-white shadow-2xl overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" /> Biblioteca Táctica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px]">
              {tacticsLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary h-6 w-6" /></div>
              ) : savedTactics?.length === 0 ? (
                <div className="text-center py-12 px-8 opacity-30 text-[10px] font-black uppercase tracking-widest">Sin tácticas cargadas</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {savedTactics?.map((t: any) => (
                    <div key={t.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                      <button onClick={() => loadTactic(t)} className="flex-1 text-left min-w-0">
                        <p className="font-black text-slate-900 text-xs truncate uppercase tracking-tight">{t.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{t.sport} • {t.playerCount} jugadoras</p>
                      </button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTactic(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-2xl overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Ajustes del Campo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-900">Disciplina</Label>
              <Tabs value={sport} onValueChange={(v: any) => updateSettings(playerCount, v)}>
                <TabsList className="grid grid-cols-2 w-full h-10 bg-slate-100 p-1">
                  <TabsTrigger value="hockey" className="font-bold uppercase text-[9px]">🏑 Hockey</TabsTrigger>
                  <TabsTrigger value="rugby" className="font-bold uppercase text-[9px]">🏉 Rugby</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase">Plantel Local</Label>
                <div className="px-2.5 py-0.5 rounded-full bg-primary text-white font-black text-[10px]">{playerCount}</div>
              </div>
              <Slider value={[playerCount]} min={5} max={sport === 'rugby' ? 15 : 11} step={1} onValueChange={(v) => updateSettings(v[0], sport)} />
            </div>

            <div className="space-y-3">
              <Button 
                onClick={addRivalMarker}
                variant="outline"
                className="w-full h-11 font-black uppercase text-[10px] tracking-widest border-accent text-accent hover:bg-accent hover:text-white transition-all gap-2 rounded-xl"
              >
                <Plus className="h-4 w-4" /> Añadir Ficha Rival
              </Button>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center italic">Añade fichas para simular al oponente</p>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Local (Arrastra al campo):</p>
              <ScrollArea className="h-[150px] pr-2">
                <div className="space-y-1.5">
                  {roster.map((player: any) => {
                    const isAssigned = positions.some(p => p.assignedPlayerId === player.playerId);
                    return (
                      <div 
                        key={player.id} 
                        draggable={!isAssigned}
                        onDragStart={(e) => onDragStartPlayer(e, player.playerId)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border-2 transition-all",
                          isAssigned 
                            ? "bg-slate-50 opacity-30 border-transparent grayscale" 
                            : "bg-white border-slate-100 shadow-sm hover:border-primary cursor-grab"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 border shadow-sm shrink-0">
                            <AvatarImage src={player.playerPhoto} />
                            <AvatarFallback className="font-bold text-slate-400 text-[8px]">{player.playerName[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] font-black text-slate-900 truncate leading-none">{player.playerName}</span>
                        </div>
                        {!isAssigned && <GripVertical className="h-3.5 w-3.5 text-slate-300" />}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
