import { useEffect, useState } from 'react';
import { onDisconnect, onValue, push, ref, remove, set } from 'firebase/database';
import { db } from './firebase';

// Announces this device in the room and reports whether the other role is online.
export function usePresence(room, role) {
  const [connected, setConnected] = useState(false);
  const [othersOnline, setOthersOnline] = useState(0);

  useEffect(() => {
    const meRef = push(ref(db, `rooms/${room}/presence/${role}`));
    const other = role === 'transmitter' ? 'receiver' : 'transmitter';

    const offConn = onValue(ref(db, '.info/connected'), (snap) => {
      const isUp = snap.val() === true;
      setConnected(isUp);
      if (isUp) {
        onDisconnect(meRef)
          .remove()
          .then(() => set(meRef, true))
          .catch(() => {});
      }
    });

    const offOther = onValue(
      ref(db, `rooms/${room}/presence/${other}`),
      (snap) => setOthersOnline(snap.size),
      () => setOthersOnline(0),
    );

    return () => {
      offConn();
      offOther();
      remove(meRef).catch(() => {});
    };
  }, [room, role]);

  return { connected, othersOnline };
}
