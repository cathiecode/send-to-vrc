import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export default function useClipboard() {
  return {
    writeText: async (text: string) => {
      await writeText(text);
    },
  };
}
