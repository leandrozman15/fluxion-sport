
'use client';

import { useState, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function DynamicBackground() {
  const { user, firestore } = useFirebase();
  const [sport, setSport] = useState<'hockey' | 'rugby' | 'none'>('hockey');

  useEffect(() => {
    if (!user || !firestore) {
      setSport('none');
      return;
    }

    const email = user.email?.toLowerCase().trim();
    if (!email) {
      setSport('none');
      return;
    }

    const qStaff = query(collection(firestore, "users"), where("email", "==", email));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setSport(data.sport === 'rugby' ? 'rugby' : data.sport === 'hockey' ? 'hockey' : 'none');
      } else {
        const qPlayer = query(collection(firestore, "all_players_index"), where("email", "==", email));
        onSnapshot(qPlayer, (pSnap) => {
          if (!pSnap.empty) {
            const data = pSnap.docs[0].data();
            setSport(data.sport === 'rugby' ? 'rugby' : data.sport === 'hockey' ? 'hockey' : 'none');
          } else {
            setSport('none');
          }
        }, (err) => console.warn("Background player listener suppressed"));
      }
    }, (err) => console.warn("Background staff listener suppressed"));

    return () => unsubStaff();
  }, [user, firestore]);

  const bgUrl = sport === 'rugby' ? "/rugby.jpg" : sport === 'hockey' ? "/hockey.jpg" : null;

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-slate-950">
      {bgUrl && (
        <div 
          className="absolute inset-0 bg-center bg-no-repeat transition-all duration-1000"
          style={{ 
            backgroundImage: `url(${bgUrl})`,
            backgroundSize: 'cover',
            opacity: 0.4 
          }}
          data-ai-hint={sport === 'rugby' ? "rugby field" : "field hockey"}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
    </div>
  );
}
