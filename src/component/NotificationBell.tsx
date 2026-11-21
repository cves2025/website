/**
 * The header bell (admin and teachers): live notifications from the server
 * (leave requests, check-ins refused, leave decisions...). A click opens the
 * page of the notification and marks it read.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="font-bold text-gray-800">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllNotificationsRead(uid, items).catch(() => undefined)}
              className="text-xs font-semibold text-navy hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {error ? (
            <p className="p-4 text-sm text-red-700">{error}</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full gap-2 px-4 py-3 text-left hover:bg-gray-50 ${item.read ? "" : "bg-navy-soft/50"}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-red-600"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-800">{item.title}</span>
                      <span className="block text-sm text-gray-600">{item.body}</span>
                      {item.createdAt && (
                        <span className="block text-xs text-gray-400">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
