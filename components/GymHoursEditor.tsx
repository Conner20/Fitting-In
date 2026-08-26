"use client";

import { useEffect, useRef, useState } from "react";

type DayHours = { day: string; open: boolean; allDay: boolean; opens: string; closes: string };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const defaults = (): DayHours[] => DAYS.map((day) => ({ day, open: true, allDay: false, opens: "05:00", closes: "23:00" }));

function to24Hour(value: string) {
    const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return null;
    let hour = Number(match[1]); const minute = match[2] ?? "00"; const suffix = match[3]?.toUpperCase();
    if (suffix === "AM" && hour === 12) hour = 0;
    if (suffix === "PM" && hour !== 12) hour += 12;
    if (hour > 23 || Number(minute) > 59) return null;
    return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseRange(value: string) {
    const parts = value.split(/\s*[–—-]\s*/);
    if (parts.length !== 2) return null;
    const opens = to24Hour(parts[0]); const closes = to24Hour(parts[1]);
    return opens && closes ? { opens, closes } : null;
}

export function parseGymHours(value: string): DayHours[] {
    const schedule = defaults(); const normalized = value.trim();
    if (!normalized) return schedule;
    if (/^open 24 hours$/i.test(normalized)) return schedule.map((day) => ({ ...day, allDay: true, opens: "00:00", closes: "23:59" }));
    const everyDay = parseRange(normalized);
    if (everyDay) return schedule.map((day) => ({ ...day, ...everyDay }));
    for (const line of normalized.split("\n")) {
        const [dayPart, ...rest] = line.split(":"); const hoursPart = rest.join(":").trim();
        if (!dayPart || !hoursPart) continue;
        const bounds = dayPart.split(/[–—-]/).map((part) => DAYS.indexOf(part.trim()));
        const start = bounds[0]; const end = bounds.length > 1 ? bounds[1] : start;
        if (start < 0 || end < start) continue;
        for (let index = start; index <= end; index++) {
            if (/closed/i.test(hoursPart)) schedule[index] = { ...schedule[index], open: false };
            else if (/24 hours/i.test(hoursPart)) schedule[index] = { ...schedule[index], open: true, allDay: true, opens: "00:00", closes: "23:59" };
            else { const range = parseRange(hoursPart); if (range) schedule[index] = { ...schedule[index], open: true, allDay: false, ...range }; }
        }
    }
    return schedule;
}

function description(day: DayHours) { return !day.open ? "Closed" : day.allDay ? "Open 24 hours" : `${day.opens} - ${day.closes}`; }
export function formatGymHours(schedule: DayHours[]) {
    const groups: { start: number; end: number; text: string }[] = [];
    schedule.forEach((day, index) => {
        const text = description(day); const previous = groups[groups.length - 1];
        if (previous?.text === text) previous.end = index; else groups.push({ start: index, end: index, text });
    });
    if (groups.length === 1 && groups[0].text === "Open 24 hours") return "Open 24 hours";
    if (groups.length === 1 && groups[0].text !== "Closed") return groups[0].text;
    return groups.map((group) => `${group.start === group.end ? DAYS[group.start] : `${DAYS[group.start]}–${DAYS[group.end]}`}: ${group.text}`).join("\n");
}

export default function GymHoursEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [schedule, setSchedule] = useState(() => parseGymHours(value));
    const emitted = useRef("");
    useEffect(() => { if (value !== emitted.current) setSchedule(parseGymHours(value)); }, [value]);
    useEffect(() => { if (!value) { const formatted = formatGymHours(schedule); emitted.current = formatted; onChange(formatted); } }, []);
    function change(index: number, patch: Partial<DayHours>) {
        const next = schedule.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day);
        const formatted = formatGymHours(next); emitted.current = formatted; setSchedule(next); onChange(formatted);
    }
    return <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-white/10">
        {schedule.map((day, index) => <div key={day.day} className="gym-hours-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-zinc-200 p-3 last:border-b-0 dark:border-white/10 sm:grid-cols-[90px_70px_70px_1fr]">
            <span className="text-sm font-semibold">{day.day.slice(0, 3)}</span>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={day.open} onChange={(event) => change(index, { open: event.target.checked })} className="h-4 w-4 accent-emerald-700"/>Open</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={day.allDay} disabled={!day.open} onChange={(event) => change(index, { allDay: event.target.checked })} className="h-4 w-4 accent-emerald-700"/>24 hrs</label>
            {day.open && !day.allDay ? <div className="col-span-3 flex items-center gap-2 sm:col-span-1"><input aria-label={`${day.day} opening time`} type="time" value={day.opens} onChange={(event) => change(index, { opens: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 sm:py-1.5"/><span className="text-zinc-400">–</span><input aria-label={`${day.day} closing time`} type="time" value={day.closes} onChange={(event) => change(index, { closes: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-zinc-900 sm:py-1.5"/></div> : <span className="col-span-3 text-xs text-zinc-500 sm:col-span-1">{day.open ? "Open all day" : "Closed"}</span>}
        </div>)}
        <div className="bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-white/5"><b>Listing display:</b> <span className="whitespace-pre-line">{formatGymHours(schedule)}</span></div>
    </div>;
}
