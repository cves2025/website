/**
 * The header bell (admin and teachers): live notifications from the server
 * (leave requests, check-ins refused, leave decisions...). A click opens the
 * page of the notification and marks it read.
 *
 * Each row: an icon in its tone's colour (NOTIFICATION_KIND_TONE, good / bad
 * words in the title win), the title, two lines of the message and the time;
 * a new one has the cves line on its left and a light background. Rows are
 * grouped Today / Earlier.
 */
import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CalendarX,
  ChevronRight,
  ClipboardCheck,
  ShieldAlert,
  Smartphone,
  type LucideProps,
} from "lucide-react";
import { formatDistanceToNow, isToday } from "date-fns";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  NOTIFICATION_BAD_WORDS,
  NOTIFICATION_GOOD_WORDS,
  NOTIFICATION_KIND_TONE,
  NOTIFICATION_TONE_CLASS,
  type NotificationTone,
} from "../constants";
import Tooltip from "../custom-components/Tooltip";
import useNotifications from "../hooks/useNotifications";
import { markAllNotificationsRead, markNotificationRead } from "../utils/notificationService";
import type { AppNotification } from "../utils/type";

interface NotificationBellProps {
  uid: string;
  /** On the dashboard gradient (white icon). */
  onBanner: boolean;
  className?: string;
}

type Icon = ComponentType<LucideProps>;

/** Tone and icon of a notification. */
function lookOf(item: AppNotification): { tone: NotificationTone; Icon: Icon } {
  const good = NOTIFICATION_GOOD_WORDS.test(item.title);
  const bad = NOTIFICATION_BAD_WORDS.test(item.title);
  const tone: NotificationTone = bad ? "bad" : good ? "good" : NOTIFICATION_KIND_TONE[item.kind] ?? "info";
  const Icon: Icon =
    item.kind === "leave"
      ? bad
        ? CalendarX
        : good
          ? CalendarCheck
          : CalendarOff
      : item.kind === "cheat"
        ? ShieldAlert
        : item.kind === "attendance"
          ? ClipboardCheck
          : item.kind === "device"
            ? Smartphone
            : item.kind === "holiday"
              ? CalendarDays
              : Bell;
  return { tone, Icon };
}

function Row({ item, onOpen }: { item: AppNotification; onOpen: (item: AppNotification) => void }) {
  const { tone, Icon } = lookOf(item);
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={`group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
          item.read ? "" : "bg-[#fdf2f7]/70"
        }`}
      >
        {/* A new one: the cves line on the left edge. */}
        {!item.read && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-cves" aria-hidden="true" />}
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${NOTIFICATION_TONE_CLASS[tone]}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${item.read ? "font-semibold text-gray-700" : "font-bold text-gray-900"}`}>
              {item.title}
            </span>
            {!item.read && <span className="sr-only">New</span>}
            {item.createdAt && (
              <span className="shrink-0 text-[11px] text-gray-400">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-gray-600">{item.body}</span>
        </span>
        {item.webLink && (
          <ChevronRight
            className="mt-2.5 h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#ad1a6f]"
            aria-hidden="true"
          />
        )}
      </button>
    </li>
  );
}

function NotificationBell({ uid, onBanner, className = "" }: NotificationBellProps) {
  const navigate = useNavigate();
  const { items, unread, error } = useNotifications(uid);
  const [open, setOpen] = useState(false);

  const openItem = (item: AppNotification) => {
    if (!item.read) void markNotificationRead(uid, item.id).catch(() => undefined);
    if (item.webLink) {
      setOpen(false);
      navigate(item.webLink);
    }
  };

  const groups = [
    { label: "Today", rows: items.filter((item) => item.createdAt && isToday(new Date(item.createdAt))) },
    { label: "Earlier", rows: items.filter((item) => !item.createdAt || !isToday(new Date(item.createdAt))) },
  ].filter((group) => group.rows.length > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content="Notifications" className={className}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
            className={`relative grid shrink-0 place-items-center rounded-full transition-colors ${
              onBanner
                ? "h-7 w-7 bg-white/15 text-white ring-1 ring-inset ring-white/40 hover:bg-white/25"
                : "h-9 w-9 bg-gray-100 text-navy hover:bg-gray-200"
            }`}
          >
            <Bell className="h-4 w-4" strokeWidth={2.5} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent align="end" className="w-[22rem] overflow-hidden rounded-2xl p-0 shadow-xl">
        {/* School-colour line on top, then the title with the new count. */}
        <span className="block h-1 bg-cves" aria-hidden="true" />
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="flex items-center gap-2 font-bold text-gray-900">
            Notifications
            {unread > 0 && (
              <span className="rounded-full bg-[#f7e8ee] px-2 py-0.5 text-xs font-bold text-[#ad1a6f]">{unread} new</span>
            )}
          </p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllNotificationsRead(uid, items).catch(() => undefined)}
              className="text-xs font-semibold text-navy hover:text-[#ad1a6f] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[26rem] overflow-y-auto border-t border-gray-100">
          {error ? (
            <p className="p-4 text-sm text-red-700">{error}</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-soft text-navy">
                <BellOff className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-gray-700">You are all caught up</p>
              <p className="text-xs text-gray-500">New leave requests, alerts and updates show here.</p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <p className="sticky top-0 z-10 bg-gray-50/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 backdrop-blur-sm">
                  {group.label}
                </p>
                <ul className="divide-y divide-gray-100">
                  {group.rows.map((item) => (
                    <Row key={item.id} item={item} onOpen={openItem} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
