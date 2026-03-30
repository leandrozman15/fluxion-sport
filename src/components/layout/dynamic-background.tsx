
'use client';

import { useState, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function DynamicBackground() {
  const { user, firestore } = useFirebase();
  const [sport, setSport] = useState<'hockey' | 'rugby'>('hockey');

  useEffect(() => {
    if (!user || !firestore) {
      setSport('hockey');
      return;
    }

    const email = user.email?.toLowerCase().trim();
    if (!email) return;

    // Buscamos el deporte del usuario por email en Staff primero
    const qStaff = query(collection(firestore, "users"), where("email", "==", email));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setSport(data.sport === 'rugby' ? 'rugby' : 'hockey');
      } else {
        // Si no es staff, buscamos en el índice de jugadores
        const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
        const unsubPlayer = onSnapshot(qPlayer, (pSnap) => {
          if (!pSnap.empty) {
            const data = pSnap.docs[0].data();
            setSport(data.sport === 'rugby' ? 'rugby' : 'hockey');
          }
        });
        return () => unsubPlayer();
      }
    });

    return () => unsubStaff();
  }, [user, firestore]);

  // Usamos .jpg para asegurar que se carguen correctamente los archivos
  const bgUrl = sport === 'rugby' ? "/rugby.jpg" : "/hockey.jpg";

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-slate-950">
      <div 
        className="absolute inset-0 bg-center bg-no-repeat transition-all duration-1000"
        style={{ 
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          opacity: 0.4 
        }}
        data-ai-hint={sport === 'rugby' ? "rugby field" : "field hockey"}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
    </div>
  );
}
