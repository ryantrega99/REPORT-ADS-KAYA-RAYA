import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "jt";
  return n.toLocaleString("id-ID");
}

export function generateLocalId() {
  return "local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
}
