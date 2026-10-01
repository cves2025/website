import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { COLLECTION } from "../../constants";
import { db } from "../../firebase/config";
import { myContext } from "../../component/context/MyContextProvider";
import { latestRelease } from "./latestRelease";

/**
 * "What's New" announcement for the latest release.
 *
 * - Shows the modal only when the user is authenticated, their Firestore
 *   profile (`users/{uid}`) has finished loading, and the release has not been
 *   seen yet (`user.lastSeenReleaseId !== latestRelease.id`).
 * - Any close action runs one single `dismiss` handler: it closes the modal
 *   immediately and writes `lastSeenReleaseId` to the user's document so the
 *   "seen" state follows the user across devices.
 * - The source of truth is the user document only - localStorage /
 *   sessionStorage are never used.
 */
export function useWhatsNew() {
  const { user, profileReady } = useContext(myContext);
  const [open, setOpen] = useState(false);

  /** True once the modal has been dismissed during this session. */
  const dismissedRef = useRef(false);
  /** Guards against two concurrent dismiss calls writing twice. */
  const dismissInFlightRef = useRef(false);

  useEffect(() => {
    if (!profileReady || !user) {
      setOpen(false);
      return;
    }

    if (dismissedRef.current) return;
    if (user.lastSeenReleaseId === latestRelease.id) return;

    setOpen(true);
  }, [profileReady, user]);

  const dismiss = useCallback(() => {
    if (dismissedRef.current || dismissInFlightRef.current) return;

    // Optimistic close: never keep the modal open because of a write.
    dismissedRef.current = true;
    setOpen(false);

    if (!user?.uid) return;

    dismissInFlightRef.current = true;
    updateDoc(doc(db, COLLECTION.USERS, user.uid), {
      lastSeenReleaseId: latestRelease.id,
      updatedAt: serverTimestamp(),
    })
      .catch((error) => {
        // Best-effort: a failed write must never look like an error to the
        // user. The modal also stays dismissed for this session.
        console.error("Could not store the seen release id:", error);
      })
      .finally(() => {
        dismissInFlightRef.current = false;
      });
  }, [user]);

  return { open, onClose: dismiss };
}
