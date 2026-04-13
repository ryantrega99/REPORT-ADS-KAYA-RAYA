import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtNum(n: number) {
  return n.toLocaleString("id-ID");
}

export function generateLocalId() {
  return "local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
}
