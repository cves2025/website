import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import Modal from "../../../../custom-components/Modal";
import CustomInput from "../../../../custom-components/CustomInput";
import CustomTextarea from "../../../../custom-components/CustomTextarea";
import PhotoUploadBox from "../../../../custom-components/admission/PhotoUploadBox";
import { Switch } from "@/components/ui/switch";
import {
  createNews,
  updateNews,
  type NewsFields,
  type NewsImageChange,
  type NewsItem,
} from "../../../../utils/newsService";
import { myContext } from "../../../context/MyContextProvider";

/** Today as "YYYY-MM-DD" in local time (the value of a date input). */
function today(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const emptyFields = (): NewsFields => ({
  heading: "",
  text: "",
  newsDate: today(),
  isPublished: true,
});

interface NewsFormModalProps {
  isOpen: boolean;
  /** The news being edited; null adds a new one. */
  news: NewsItem | null;
  onClose: () => void;
}

/** Add / edit one news item. The image is optional. */
function NewsFormModal({ isOpen, news, onClose }: NewsFormModalProps) {
  const { user } = useContext(myContext);
  const { control, handleSubmit, reset, watch, setValue } = useForm<NewsFields>({
    defaultValues: emptyFields(),
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const isPublished = watch("isPublished");

  // Every open starts from the news being edited (or an empty form).
  useEffect(() => {
    if (!isOpen) return;
    reset(
      news
        ? {
            heading: news.heading,
            text: news.text,
            newsDate: news.newsDate,
            isPublished: news.isPublished,
          }
        : emptyFields()
    );
    setImageFile(null);
    setImageRemoved(false);
  }, [isOpen, news, reset]);

  const handleImageSelected = (file: File | null) => {
    setImageFile(file);
    setImageRemoved(file === null);
  };

  const save = async (fields: NewsFields) => {
    setSaving(true);
    try {
      if (news) {
        const image: NewsImageChange = imageFile
          ? { kind: "replace", file: imageFile }
          : imageRemoved && news.imageUrl
            ? { kind: "remove" }
            : { kind: "keep" };
        await updateNews(news.id, fields, image);
        toast.success("News updated.");
      } else {
        await createNews(fields, imageFile, user?.uid ?? "");
        toast.success("News added.");
      }
      onClose();
    } catch (error) {
      console.error("Failed to save news:", error);
      toast.error("Failed to save the news. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={news ? "Edit News" : "Add News"}
      submitText={news ? "Update" : "Add"}
      loading={saving}
      onSubmit={() => void handleSubmit(save)()}
      modalClassName="max-w-2xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <PhotoUploadBox
            label={"NEWS\nIMAGE"}
            photoUrl={imageRemoved ? undefined : news?.imageUrl || undefined}
            onFileSelected={handleImageSelected}
            disabled={saving}
          />
          <span className="text-xs text-gray-500">Optional</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CustomInput
            control={control}
            name="heading"
            label="Heading"
            placeholder="e.g. Annual Exam Announcement"
            rules={{
              validate: (value) =>
                String(value).trim() !== "" || "Please enter a heading.",
            }}
            required
            disabled={saving}
          />
          <CustomInput
            control={control}
            name="newsDate"
            label="Date"
            type="date"
            rules={{ required: "Please choose a date." }}
            required
            disabled={saving}
          />
          <CustomTextarea
            control={control}
            name="text"
            label="News"
            rows={6}
            placeholder="Write the news here..."
            rules={{
              validate: (value) =>
                String(value).trim() !== "" || "Please write the news.",
            }}
            required
            disabled={saving}
          />
          <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Show on Home page
              </p>
              <p className="text-xs text-gray-500">
                OFF keeps the news saved but hidden.
              </p>
            </div>
            <Switch
              checked={isPublished}
              onCheckedChange={(next) =>
                setValue("isPublished", next, { shouldDirty: true })
              }
              disabled={saving}
              aria-label="Show on Home page"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default NewsFormModal;
