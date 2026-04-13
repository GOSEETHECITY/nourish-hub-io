/**
 * Format a time string like "09:00:00" or "09:00" into "9:00 AM".
 */
export function formatTime(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Format a date string like "2026-04-15" into "Tue, Apr 15".
 */
export function formatDateShort(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date string like "2026-04-15" into "April 15, 2026".
 */
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Build a cross-platform map link from an address string.
 * On iOS it opens Apple Maps, on Android/desktop it opens Google Maps.
 */
export function buildMapLink(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://maps.google.com/?q=${encoded}`;
}

/**
 * Generate an ICS calendar string for an event, returns a data URI to download.
 */
export function buildCalendarUrl(event: {
  title: string;
  description?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const date = (event.event_date || "").replace(/-/g, "");
  const start = (event.start_time || "00:00:00").replace(/:/g, "").slice(0, 6);
  const end = (event.end_time || event.start_time || "01:00:00").replace(/:/g, "").slice(0, 6);
  const location = [event.address, event.city, event.state].filter(Boolean).join(", ");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `DTSTART:${date}T${start}`,
    `DTEND:${date}T${end}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || "").slice(0, 200)}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}
