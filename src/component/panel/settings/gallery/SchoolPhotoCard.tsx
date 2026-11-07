import { useContext, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import toast from "react-hot-toast";

import Button from "../../../../custom-components/Button";
import Modal from "../../../../custom-components/Modal";
import schoolBuilding from "../../../../assets/image/schoolImage.jpg";
import {
  removeSchoolPhoto,
  saveSchoolPhoto,
  subscribeSchoolPhoto,
} from "../../../../utils/siteImagesService";
import { myContext } from "../../../context/MyContextProvider";
import { CVES_ON_HOVER } from "../../../../constants";

/** The school photo of the Home and About pages: replace or reset it. */
function SchoolPhotoCard() {
  const { user } = useContext(myContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // null = still loading; "" = the bundled default photo is used.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(
    () =>
      subscribeSchoolPhoto(setPhotoUrl, (error) => {
        console.error("Failed to load the school photo:", error);
        toast.error("The school photo could not be loaded.");
      }),
    []
  );

  const handlePicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    setSaving(true);
    try {
      await saveSchoolPhoto(file, user?.uid ?? "");
      toast.success("School photo updated on the Home and About pages.");
    } catch (error) {
      console.error("Failed to save the school photo:", error);
      toast.error("Failed to upload the photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await removeSchoolPhoto(user?.uid ?? "");
      toast.success("The default school photo is shown again.");
      setConfirmReset(false);
    } catch (error) {
      console.error("Failed to reset the school photo:", error);
      toast.error("Could not reset the photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isDefault = photoUrl === "";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      {photoUrl === null ? (
        <div className="aspect-[4/3] w-full shrink-0 animate-pulse rounded-lg bg-gray-100 sm:w-56" />
      ) : (
        <img
          src={photoUrl || schoolBuilding}
          alt="School photo"
          className="aspect-[4/3] w-full shrink-0 rounded-lg border object-cover sm:w-56"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-gray-800">School Photo</h2>
          {photoUrl !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isDefault
                  ? "bg-gray-100 text-gray-600"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isDefault ? "Default photo" : "Uploaded"}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Shown in the "Welcome To Children's Valley English School" section of
          the Home and About pages. A wide (landscape) photo looks best.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            buttonName={saving ? "Saving..." : "Change photo"}
            variant="cves"
            size="sm"
            disabled={saving || photoUrl === null}
            onClick={() => fileInputRef.current?.click()}
          />
          {!isDefault && photoUrl !== null && (
            <Button
              buttonName="Use default photo"
              variant="outline"
              size="sm"
              buttonStyle={CVES_ON_HOVER}
              disabled={saving}
              onClick={() => setConfirmReset(true)}
            />
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handlePicked(event)}
      />

      <Modal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Use Default Photo"
        description="The uploaded photo is deleted and the original school photo is shown on the Home and About pages again."
        submitText="Use default"
        loading={saving}
        onSubmit={handleReset}
      />
    </div>
  );
}

export default SchoolPhotoCard;
