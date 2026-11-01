import { useContext, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";

import Button from "../../../../custom-components/Button";
import PageHeader from "../../../../custom-components/PageHeader";
import { Button as UIButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { generateAcademicYears } from "../../../../utils/generateAcademicYears";
import { LEGACY_BANNER_SLIDES } from "../../../../utils/legacyBanner";
import {
  DEFAULT_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  bannerImageClasses,
  clampInterval,
  deleteBannerImage,
  importLegacyBanner,
  newSlideId,
  saveHomeBanner,
  subscribeHomeBanner,
  uploadBannerImage,
  type BannerFit,
  type BannerPosition,
  type BannerSlide,
  type HomeBanner,
} from "../../../../utils/homeBannerService";
import { myContext } from "../../../context/MyContextProvider";

const FIT_OPTIONS: { value: BannerFit; label: string }[] = [
  { value: "cover", label: "Fill screen" },
  { value: "contain", label: "Whole photo" },
];

const POSITION_OPTIONS: { value: BannerPosition; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

/** Small segmented control used for the photo fit and position. */
function Segmented<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold text-gray-600">{label}</span>
      <div className="inline-flex rounded-md border border-gray-200 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
              value === option.value
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const CURRENT_SESSION = generateAcademicYears()[0]?.value ?? "";

/** A slide being edited; a picked photo is only uploaded on Save. */
interface DraftSlide extends BannerSlide {
  file?: File;
  previewUrl?: string;
}

interface Draft {
  slides: DraftSlide[];
  intervalSeconds: number;
}

const EMPTY_BANNER: HomeBanner = {
  slides: [],
  intervalSeconds: DEFAULT_INTERVAL_SECONDS,
  legacyImported: false,
};

function revokePreviews(slides: DraftSlide[]) {
  slides.forEach((slide) => {
    if (slide.previewUrl) URL.revokeObjectURL(slide.previewUrl);
  });
}

/**
 * Settings > Home Banner: the slides at the top of the Home page. Every
 * change (text, photo, order, show / hide, delete, timing) is a draft until
 * "Save"; new photos are uploaded then.
 */
function HomeBannerManager() {
  const { user } = useContext(myContext);
  // undefined = loading; null = never saved (the bundled slides are shown).
  const [banner, setBanner] = useState<HomeBanner | null | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [intervalInput, setIntervalInput] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeHomeBanner(
        (next) => {
          setBanner(next);
          setLoadError(null);
        },
        (error) => {
          console.error("Failed to load the banner:", error);
          setLoadError("The banner could not be loaded. Please reload the page.");
        }
      ),
    []
  );

  const saved = banner ?? EMPTY_BANNER;
  const current: Draft = draft ?? saved;
  const dirty = draft !== null;

  const update = (change: (value: Draft) => Draft) =>
    setDraft((value) => change(value ?? saved));

  const updateSlide = (id: string, change: Partial<DraftSlide>) =>
    update((value) => ({
      ...value,
      slides: value.slides.map((slide) =>
        slide.id === id ? { ...slide, ...change } : slide
      ),
    }));

  const moveSlide = (index: number, delta: -1 | 1) =>
    update((value) => {
      const slides = [...value.slides];
      const target = index + delta;
      if (target < 0 || target >= slides.length) return value;
      [slides[index], slides[target]] = [slides[target], slides[index]];
      return { ...value, slides };
    });

  const removeSlide = (id: string) =>
    update((value) => {
      revokePreviews(value.slides.filter((slide) => slide.id === id));
      return { ...value, slides: value.slides.filter((slide) => slide.id !== id) };
    });

  const addSlide = () =>
    update((value) => ({
      ...value,
      slides: [
        ...value.slides,
        {
          id: newSlideId(),
          imageUrl: "",
          title: "",
          description: "",
          showSession: false,
          isPublished: true,
          fit: "cover",
          position: "center",
        },
      ],
    }));

  const pickPhoto = (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const old = current.slides.find((slide) => slide.id === id);
    if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
    updateSlide(id, { file, previewUrl: URL.createObjectURL(file) });
  };

  const discard = () => {
    if (draft) revokePreviews(draft.slides);
    setDraft(null);
  };

  const missingPhoto = current.slides.some(
    (slide) => !slide.imageUrl && !slide.file
  );
  const shownCount = current.slides.filter((slide) => slide.isPublished).length;

  const handleSave = async () => {
    if (!draft) return;
    if (missingPhoto) {
      toast.error("Every slide needs a photo.");
      return;
    }
    setSaving(true);
    try {
      const slides: BannerSlide[] = [];
      for (const slide of draft.slides) {
        const imageUrl = slide.file
          ? await uploadBannerImage(slide.id, slide.file)
          : slide.imageUrl;
        slides.push({
          id: slide.id,
          imageUrl,
          title: slide.title,
          description: slide.description,
          showSession: slide.showSession,
          isPublished: slide.isPublished,
          fit: slide.fit,
          position: slide.position,
        });
      }
      await saveHomeBanner(
        {
          slides,
          intervalSeconds: draft.intervalSeconds,
          legacyImported: saved.legacyImported,
        },
        user?.uid ?? ""
      );

      // Photos of removed slides are not needed any more.
      const keptIds = new Set(slides.map((slide) => slide.id));
      await Promise.all(
        saved.slides
          .filter((slide) => !keptIds.has(slide.id))
          .map((slide) =>
            deleteBannerImage(slide.id).catch((error) =>
              console.error("Failed to delete an old banner photo:", error)
            )
          )
      );

      revokePreviews(draft.slides);
      setDraft(null);
      toast.success("Home banner saved.");
    } catch (error) {
      console.error("Failed to save the banner:", error);
      toast.error("Failed to save the banner. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    setImportProgress(`0 of ${LEGACY_BANNER_SLIDES.length}`);
    try {
      await importLegacyBanner(
        LEGACY_BANNER_SLIDES,
        banner ?? null,
        user?.uid ?? "",
        (done, total) => setImportProgress(`${done} of ${total}`)
      );
      toast.success("Current slides imported.");
    } catch (error) {
      console.error("Banner import failed:", error);
      toast.error("The import failed. Please try again.");
    } finally {
      setImportProgress(null);
    }
  };

  const busy = saving || importProgress !== null;
  const notImported = banner !== undefined && !banner?.legacyImported;
  const savedShownCount = saved.slides.filter((slide) => slide.isPublished).length;

  // What is typed is kept as text and checked when the field is left.
  const intervalText = intervalInput ?? String(current.intervalSeconds);
  const commitInterval = () => {
    if (intervalInput === null) return;
    const seconds = clampInterval(Number(intervalInput));
    setIntervalInput(null);
    if (seconds !== current.intervalSeconds) {
      update((value) => ({ ...value, intervalSeconds: seconds }));
    }
  };

  if (banner === undefined && !loadError) {
    return (
      <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500">
        Loading the banner...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Home Banner"
        titleStyle="text-primaryBlue"
        description="The slides at the top of the Home page. Changes are saved only when you click Save."
        descriptionStyle="text-gray-500"
      />

      {loadError && (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {notImported && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            {savedShownCount > 0
              ? `The Home page shows your slides below. The ${LEGACY_BANNER_SLIDES.length} old slides from the website code come back if none of yours is shown.`
              : `The Home page shows the ${LEGACY_BANNER_SLIDES.length} old slides from the website code until one of your slides is shown.`}{" "}
            Import the old slides once to edit them here - they are added after
            your slides.
            {dirty && " Save or discard your changes first."}
            {importProgress && ` Importing ${importProgress}...`}
          </span>
          <Button
            buttonName={`Import old slides (${LEGACY_BANNER_SLIDES.length})`}
            variant="warning"
            size="sm"
            disabled={busy || dirty}
            onClick={() => void handleImport()}
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-white px-4 py-3">
        <div className="w-48">
          <Label htmlFor="banner-interval" className="mb-1 block font-bold">
            Next slide after (seconds)
          </Label>
          <Input
            id="banner-interval"
            type="number"
            min={MIN_INTERVAL_SECONDS}
            max={MAX_INTERVAL_SECONDS}
            value={intervalText}
            disabled={busy}
            onChange={(event) => setIntervalInput(event.target.value)}
            onBlur={commitInterval}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitInterval();
            }}
          />
        </div>
        <p className="pb-2 text-sm text-gray-500">
          {shownCount} of {current.slides.length} slides shown. Visitors can also
          use the arrows or swipe on a phone.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {current.slides.map((slide, index) => {
          const photo = slide.previewUrl || slide.imageUrl;
          const inputId = `banner-photo-${slide.id}`;
          return (
            <div
              key={slide.id}
              className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
                slide.isPublished ? "border-gray-200" : "border-dashed border-gray-300"
              }`}
            >
              {/* Preview with the text as it appears on the Home page */}
              <div className="relative aspect-video overflow-hidden bg-gray-800">
                {photo ? (
                  <>
                    {slide.fit === "contain" && (
                      <img
                        src={photo}
                        alt=""
                        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
                      />
                    )}
                    <img
                      src={photo}
                      alt=""
                      className={`relative h-full w-full ${bannerImageClasses(slide.fit, slide.position)} ${
                        slide.isPublished ? "" : "opacity-50"
                      }`}
                    />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-red-300">
                    Photo required
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 px-4 text-center">
                  <p className="text-lg font-bold text-yellow-400 md:text-2xl">
                    {slide.title || "Title"}
                    {slide.showSession && ` ${CURRENT_SESSION}`}
                  </p>
                  <p className="text-sm text-white md:text-base">
                    {slide.description || "Description"}
                  </p>
                </div>
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <label
                  htmlFor={inputId}
                  className={`absolute bottom-2 right-2 flex cursor-pointer items-center gap-1.5 rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-bold text-gray-800 hover:bg-white ${
                    busy ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <ImagePlus className="h-4 w-4" />
                  {photo ? "Change photo" : "Add photo"}
                </label>
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => pickPhoto(slide.id, event)}
                />
              </div>

              <div className="flex flex-col gap-3 p-4">
                <div>
                  <Label htmlFor={`banner-title-${slide.id}`} className="mb-1 block font-bold">
                    Title
                  </Label>
                  <Input
                    id={`banner-title-${slide.id}`}
                    value={slide.title}
                    maxLength={80}
                    disabled={busy}
                    placeholder="e.g. ADMISSION OPEN"
                    onChange={(event) =>
                      updateSlide(slide.id, { title: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`banner-text-${slide.id}`} className="mb-1 block font-bold">
                    Description
                  </Label>
                  <Input
                    id={`banner-text-${slide.id}`}
                    value={slide.description}
                    maxLength={200}
                    disabled={busy}
                    placeholder="e.g. Your Journey to Success Begins Here"
                    onChange={(event) =>
                      updateSlide(slide.id, { description: event.target.value })
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <Segmented
                    label="Photo fit"
                    value={slide.fit}
                    options={FIT_OPTIONS}
                    disabled={busy}
                    onChange={(fit) => updateSlide(slide.id, { fit })}
                  />
                  <Segmented
                    label="Keep in view"
                    value={slide.position}
                    options={POSITION_OPTIONS}
                    disabled={busy}
                    onChange={(position) => updateSlide(slide.id, { position })}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <Switch
                        checked={slide.isPublished}
                        disabled={busy}
                        onCheckedChange={(next) =>
                          updateSlide(slide.id, { isPublished: next })
                        }
                        aria-label="Show this slide"
                      />
                      {slide.isPublished ? "Shown" : "Hidden"}
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <Switch
                        checked={slide.showSession}
                        disabled={busy}
                        onCheckedChange={(next) =>
                          updateSlide(slide.id, { showSession: next })
                        }
                        aria-label="Show the session after the title"
                      />
                      Add {CURRENT_SESSION} after title
                    </label>
                  </div>
                  <div className="flex gap-1.5">
                    <UIButton
                      type="button"
                      size="icon"
                      variant="outline"
                      title="Move up"
                      aria-label="Move slide up"
                      disabled={busy || index === 0}
                      onClick={() => moveSlide(index, -1)}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </UIButton>
                    <UIButton
                      type="button"
                      size="icon"
                      variant="outline"
                      title="Move down"
                      aria-label="Move slide down"
                      disabled={busy || index === current.slides.length - 1}
                      onClick={() => moveSlide(index, 1)}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </UIButton>
                    <UIButton
                      type="button"
                      size="icon"
                      variant="destructive"
                      title="Remove slide"
                      aria-label="Remove slide"
                      disabled={busy}
                      onClick={() => removeSlide(slide.id)}
                      className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </UIButton>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addSlide}
          disabled={busy}
          className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white text-sm font-bold text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 disabled:opacity-60"
        >
          <ImagePlus className="h-8 w-8" />
          + Add Slide
        </button>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3">
        {dirty && (
          <span className="mr-auto text-xs font-semibold text-amber-700">
            Unsaved changes
          </span>
        )}
        <Button
          buttonName="Discard"
          variant="ghost"
          size="sm"
          disabled={!dirty || busy}
          onClick={discard}
        />
        <Button
          buttonName={saving ? "Saving..." : "Save"}
          variant="success"
          size="sm"
          disabled={!dirty || busy || missingPhoto}
          onClick={() => void handleSave()}
        />
      </div>
    </div>
  );
}

export default HomeBannerManager;
