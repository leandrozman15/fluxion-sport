
'use client';

import { useState, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

/**
 * Fondo Dinámico que detecta el deporte del usuario cruzando UID y Email.
 */
export function DynamicBackground() {
  const { user, firestore } = useFirebase();
  const [sport, setSport] = useState<'hockey' | 'rugby' | 'none'>('hockey');

  useEffect(() => {
    if (!user || !firestore) {
      setSport('none');
      return;
    }

    async function detectSport() {
      try {
        const email = user.email?.toLowerCase().trim() || "";
        let profileData = null;

        // 1. Por UID
        const uDoc = await getDoc(doc(firestore, "users", user.uid));
        if (uDoc.exists()) {
          profileData = uDoc.data();
        } else {
          const pDoc = await getDoc(doc(firestore, "all_players_index", user.uid));
          if (pDoc.exists()) profileData = pDoc.data();
        }

        // 2. Por Email
        if (!profileData && email) {
          const qS = await getDocs(query(collection(firestore, "users"), where("email", "==", email)));
          if (!qS.empty) {
            profileData = qS.docs[0].data();
          } else {
            const qP = await getDocs(query(collection(firestore, "all_players_index"), where("email", "==", email)));
            if (!qP.empty) profileData = qP.docs[0].data();
          }
        }

        if (profileData?.sport === 'rugby') setSport('rugby');
        else if (profileData?.sport === 'hockey') setSport('hockey');
        else setSport('none');

      } catch (err) {
        console.warn("Sport detection suppressed");
      }
    }

    detectSport();
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
