import { convertFileSrc } from "@tauri-apps/api/core";

export default function convertFreshFileSrc(filePath: string): string {
  return convertFileSrc(filePath) + "?t=" + Date.now();
}
