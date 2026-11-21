/**
 * The bell: notifications/{uid}/items (written by the server: leave,
 * staff attendance). Live, newest first; the user only marks them read.
 */
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { NOTIFICATIONS_SHOWN } from "../constants";
import { db } from "../firebase/config";
import type { AppNotification } from "./type";

const itemsOf = (uid: string) => collection(db, "notifications", uid, "items");

export function subscribeMyNotifications(
  uid: string,
  onData: (items: AppNotification[]) => void,
  onError: (cause: unknown) => void
): () => void {
  return onSnapshot(
    query(itemsOf(uid), orderBy("createdAt", "desc"), limit(NOTIFICATIONS_SHOWN)),
    (snap) =>
      onData(
        snap.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            title: String(data.title ?? ""),
            body: String(data.body ?? ""),
            kind: String(data.kind ?? ""),
            webLink: String(data.webLink ?? ""),
            read: data.read === true,
            createdAt: typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : null,
          };
        })
      ),
    onError
  );
}

export const markNotificationRead = (uid: string, id: string) => updateDoc(doc(itemsOf(uid), id), { read: true });

export async function markAllNotificationsRead(uid: string, items: AppNotification[]): Promise<void> {
  const unread = items.filter((item) => !item.read);
  if (!unread.length) return;
  const batch = writeBatch(db);
  unread.forEach((item) => batch.update(doc(itemsOf(uid), item.id), { read: true }));
  await batch.commit();
}
