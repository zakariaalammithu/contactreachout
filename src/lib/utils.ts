import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function truncateText(text: string, maxLength: number = 50): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function generateNextUniqueCampaignName(existingCampaigns: Array<{ name?: string }>): string {
  const existingNames = new Set(
    (existingCampaigns || []).map((c) => (c?.name || '').trim().toLowerCase())
  );

  let index = 1;
  while (true) {
    const candidate = `New Campaign ${index}`;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
    index++;
  }
}

