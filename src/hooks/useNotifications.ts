import { useEffect, useState } from "react";

import { subscribeMyNotifications } from "../utils/notificationService";
import type { AppNotification } from "../utils/type";

/** Live notifications of the signed-in user (the header bell). */
export function useNotifications(uid: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeMyNotifications(
      uid,
      (next) => {
        setItems(next);
        setError(null);
      },
      (cause) => {
        console.error("Notifications could not be loaded:", cause);
        setError("Notifications could not be loaded.");
      }
    );
  }, [uid]);

  return { items: uid ? items : [], unread: uid ? items.filter((item) => !item.read).length : 0, error };
}

export default useNotifications;
