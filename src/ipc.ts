import { invoke } from "@tauri-apps/api/core";

export async function openResourceDir() {
  await invoke("open_resource_dir");
}
