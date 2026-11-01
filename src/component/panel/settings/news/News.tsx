import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";

import Button from "../../../../custom-components/Button";
import Modal from "../../../../custom-components/Modal";
import PageHeader from "../../../../custom-components/PageHeader";
import { Button as UIButton } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import schoolLogo from "../../../../assets/image/schoolLogo.jpg";
import {
  deleteNews,
  setNewsPublished,
  subscribeNews,
  type NewsItem,
} from "../../../../utils/newsService";
import NewsFormModal from "./NewsFormModal";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || "-"
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

/**
 * Settings > News: add, edit, publish / hide and delete the news shown on
 * the Home page. The list is live, newest first.
 */
function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [toDelete, setToDelete] = useState<NewsItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeNews(
        { publishedOnly: false },
        (next) => {
          setItems(next);
          setError(null);
          setLoading(false);
        },
        (loadError) => {
          console.error("Failed to load news:", loadError);
          setError("The news could not be loaded. Please reload the page.");
          setLoading(false);
        }
      ),
    []
  );

  const openForm = (news: NewsItem | null) => {
    setEditing(news);
    setFormOpen(true);
  };

  const handleToggle = async (news: NewsItem, next: boolean) => {
    setTogglingId(news.id);
    try {
      await setNewsPublished(news.id, next);
      toast.success(next ? "News is now on the Home page." : "News hidden.");
    } catch (toggleError) {
      console.error("Failed to change news visibility:", toggleError);
      toast.error("Could not change it. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteNews(toDelete.id);
      toast.success("News deleted.");
      setToDelete(null);
    } catch (deleteError) {
      console.error("Failed to delete news:", deleteError);
      toast.error("Failed to delete the news. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const publishedCount = items.filter((news) => news.isPublished).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="News"
        titleStyle="text-primaryBlue"
        description="News shown in the Latest News section of the Home page. Switch a news OFF to hide it without deleting it."
        descriptionStyle="text-gray-500"
        button={
          <Button
            buttonName="+ Add News"
            variant="success"
            size="md"
            buttonStyle="rounded-full bg-blue-600 hover:bg-blue-700"
            onClick={() => openForm(null)}
          />
        }
      />

      {loading ? (
        <p className="rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-500">
          Loading news...
        </p>
      ) : error ? (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-6 text-center text-sm font-semibold text-blue-700">
          No news yet. Click "+ Add News" to add the first one.
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {publishedCount} of {items.length} news shown on the Home page.
          </p>
          <div className="flex flex-col gap-3">
            {items.map((news) => (
              <div
                key={news.id}
                className={`flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-sm sm:flex-row ${
                  news.isPublished ? "border-gray-200" : "border-dashed border-gray-300 opacity-75"
                }`}
              >
                <img
                  src={news.imageUrl || schoolLogo}
                  alt={news.heading}
                  className={`h-28 w-28 shrink-0 rounded-lg border ${
                    news.imageUrl ? "object-cover" : "object-contain p-2"
                  }`}
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-gray-800">
                      {news.heading}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        news.isPublished
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {news.isPublished ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500">
                    {formatDate(news.newsDate)}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-gray-700">
                    {news.text}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    {news.isPublished ? "ON" : "OFF"}
                    <Switch
                      checked={news.isPublished}
                      onCheckedChange={(next) => void handleToggle(news, next)}
                      disabled={togglingId === news.id}
                      aria-label={`Show ${news.heading} on the Home page`}
                    />
                  </label>
                  <div className="flex gap-2">
                    <UIButton
                      type="button"
                      size="icon"
                      title="Edit"
                      aria-label={`Edit ${news.heading}`}
                      onClick={() => openForm(news)}
                      className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </UIButton>
                    <UIButton
                      type="button"
                      size="icon"
                      variant="destructive"
                      title="Delete"
                      aria-label={`Delete ${news.heading}`}
                      onClick={() => setToDelete(news)}
                      className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </UIButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <NewsFormModal
        isOpen={formOpen}
        news={editing}
        onClose={() => setFormOpen(false)}
      />

      <Modal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete News"
        description={
          toDelete
            ? `Delete "${toDelete.heading}"? Its image is deleted too. This cannot be undone.`
            : ""
        }
        submitText="Delete"
        submitClassName="bg-red-600 hover:bg-red-700"
        loading={deleting}
        onSubmit={handleDelete}
      />
    </div>
  );
}

export default News;
