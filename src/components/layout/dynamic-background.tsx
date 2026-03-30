
'use client';

import { useState, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function DynamicBackground() {
  const { user, firestore } = useFirebase();
  const [sport, setSport] = useState<'hockey' | 'rugby'>('hockey');

  useEffect(() => {
    if (!user || !firestore) {
      setSport('hockey');
      return;
    }

    // Escuchamos cambios en el perfil del usuario para cambiar el fondo en tiempo real
    const unsubscribe = onSnapshot(doc(firestore, "users", user.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        if (userData.sport === 'rugby') {
          setSport('rugby');
        } else {
          setSport('hockey');
        }
      }
    }, (error) => {
      console.error("Error fetching user sport for background:", error);
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const bgUrl = sport === 'rugby' ? "/rugby.png" : "/hockey.jpg";

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-slate-950">
      <div 
        className="absolute inset-0 bg-center bg-no-repeat transition-all duration-1000"
        style={{ 
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: '75%',
          opacity: 0.5 
        }}
        data-ai-hint={sport === 'rugby' ? "rugby field" : "field hockey"}
      />
      {/* Velo de claridad */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/30" />
    </div>
  );
}
