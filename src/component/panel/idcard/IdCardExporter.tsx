/**
 * Export of the ticked ID cards: each card is drawn off screen at its real
 * size, one after the other, waits for its pictures and fonts, and becomes a
 * 300 DPI PNG. One card downloads as a PNG; several come in one ZIP. A
 * progress dialog shows how far it is and can stop it.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../custom-components/Modal";
import { loadStudentPhoto } from "../../../hooks/useStudentPhoto";
import { cardToPng, cardFileName, downloadBlob, inlineImages, waitForImages, zipCards } from "../../../utils/idCardExport";
import { cardSize, scaleLayout } from "../../../utils/idCardSettings";
import type { SchoolSigns } from "../../../utils/idCardService";
import type { IdCardPerson, IdCardSettings, IdCardTabSettings } from "../../../utils/type";
import { CardFace, cardValues } from "./IdCardView";

interface IdCardExporterProps {
  people: IdCardPerson[];
  tab: IdCardTabSettings;
  settings: Pick<IdCardSettings, "width" | "height">;
  session: string;
  signs: SchoolSigns;
  /** ZIP file name, without ".zip". */
  zipName: string;
  onClose: () => void;
}

function IdCardExporter({ people, tab, settings, session, signs, zipName, onClose }: IdCardExporterProps) {
  const [current, setCurrent] = useState<{ person: IdCardPerson; photo: string } | null>(null);
  const [done, setDone] = useState(0);
  const [phase, setPhase] = useState<"cards" | "zip">("cards");
  const nodeRef = useRef<HTMLDivElement>(null);
  const shown = useRef<(() => void) | null>(null);
  // "Stop" was pressed.
  const stopped = useRef(false);

  const size = cardSize(settings, tab.orientation);
  const layout = scaleLayout(tab[tab.orientation], size.width, size.height);

  // A card is on screen: let the export loop go on.
  useLayoutEffect(() => {
    if (current && shown.current) {
      const resolve = shown.current;
      shown.current = null;
      resolve();
    }
  }, [current]);

  useEffect(() => {
    // This run only (React may start an effect twice in development).
    const thisRun = { cancelled: false };
    const isCancelled = () => thisRun.cancelled || stopped.current;
    const show = (person: IdCardPerson, photo: string) =>
      new Promise<void>((resolve) => {
        shown.current = resolve;
        setCurrent({ person, photo });
      });

    const run = async () => {
      const files: { name: string; blob: Blob }[] = [];
      let missingPictures = false;
      try {
        for (const person of people) {
          if (isCancelled()) return;
          const photo =
            person.kind === "student" ? person.photo || (await loadStudentPhoto(person.id).catch(() => "")) : person.photo;
          await show(person, photo);
          const node = nodeRef.current?.firstElementChild as HTMLElement | null;
          if (!node) throw new Error("The card could not be drawn.");
          await waitForImages(node);
          if ((await inlineImages(node)) > 0) missingPictures = true;
          files.push({ name: cardFileName(person), blob: await cardToPng(node) });
          setDone(files.length);
        }
        if (isCancelled()) return;
        if (files.length === 1) {
          downloadBlob(files[0].blob, files[0].name);
        } else {
          setPhase("zip");
          downloadBlob(await zipCards(files), `${zipName}.zip`);
        }
        toast.success(`${files.length} ID card${files.length === 1 ? "" : "s"} exported.`);
        if (missingPictures) {
          toast.error(
            "Some photos or signatures could not be added: the image storage does not allow it yet (CORS). See docs/features/id-card.md.",
            { duration: 8000 }
          );
        }
      } catch (cause) {
        console.error("ID card export failed.", cause);
        // The reason, so a failure can be told apart (and reported).
        const reason =
          cause instanceof Error ? cause.message : cause instanceof Event ? `${cause.type} event` : String(cause);
        toast.error(`The ID cards could not be exported: ${reason}`, { duration: 10000 });
      } finally {
        // A run React threw away closes nothing; Stop has closed already.
        if (!thisRun.cancelled && !stopped.current) onClose();
      }
    };
    void run();
    return () => {
      thisRun.cancelled = true;
    };
    // Runs once for the people it was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = people.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      {/* Off screen: the card being turned into an image, at its real size. */}
      <div ref={nodeRef} aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
        {current && (
          <CardFace
            layout={layout}
            kind={current.person.kind}
            values={cardValues(current.person, tab, session)}
            photo={current.photo}
            personName={current.person.name}
            code={current.person.code}
            signs={signs}
            unit={(mm) => `${mm}mm`}
          />
        )}
      </div>

      <Modal
        isOpen
        onClose={() => {
          stopped.current = true;
          onClose();
        }}
        title="Exporting ID cards"
        description={
          phase === "zip"
            ? "Putting the cards in one ZIP file..."
            : `Making card ${Math.min(done + 1, total)} of ${total} (300 DPI PNG).`
        }
        cancelText="Stop"
        hideSubmit
        onSubmit={() => undefined}
      >
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-cves transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-right text-xs text-gray-500">{done} / {total}</p>
      </Modal>
    </>
  );
}

export default IdCardExporter;
