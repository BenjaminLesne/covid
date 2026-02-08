import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function accentInsensitiveFilter(value: string, search: string): number {
  const normalizedValue = stripDiacritics(value).toLowerCase()
  const normalizedSearch = stripDiacritics(search).toLowerCase()
  return normalizedValue.includes(normalizedSearch) ? 1 : 0
}
