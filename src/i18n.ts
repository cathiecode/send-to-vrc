import { atom, useAtomValue } from "jotai";
import { atomWithCache } from "jotai-cache";
import { match } from "@formatjs/intl-localematcher";
import { commands } from "./bindings.gen";
import { configuredLangAtom } from "./stores/config";

async function availableLangs(): Promise<string[]> {
  const res = await fetch("/translation/available.json");

  if (!res.ok) {
    console.warn("Failed to fetch available languages");
    return ["en"];
  }

  const json: { lang: string }[] = await res.json();

  console.log(json);
  return json.map((item) => item.lang);
}

async function loadFallbackLocalized(): Promise<(code: string) => string> {
  const res = await fetch("/translation/en.json");
  const json = await res.json();
  return (code: string): string => json[code] ?? code;
}

async function createLocalized(
  lang: string,
): Promise<(code: string) => string> {
  const fallback = await loadFallbackLocalized();
  const translationResult = await fetch("/translation/" + lang + ".json");

  if (!translationResult.ok) {
    console.warn("Failed to load translation for lang:", lang);
    return fallback;
  }

  const translationResultJson = await translationResult.json();

  return (code: string): string =>
    translationResultJson[code] ?? fallback(code);
}

export const systemLangAtom = atom(async () => {
  const systemLang = await commands.getSystemLocale();

  return systemLang;
});

export const availableLangsAtom = atom(async () => {
  return await availableLangs();
});

export const currentLangAtom = atom(async (get) => {
  const systemLang = (await get(systemLangAtom)) ?? "en";

  const availableSystemLang = match(
    [systemLang],
    await get(availableLangsAtom),
    "en",
  );

  const configuredLang = await get(configuredLangAtom);

  if (configuredLang !== undefined && configuredLang !== "SYSTEM") {
    const availableConfiguredLang = match(
      [configuredLang],
      await get(availableLangsAtom),
      availableSystemLang,
    );

    return availableConfiguredLang;
  }

  return availableSystemLang;
});

const localizedAtom = atomWithCache(async (get) => {
  const currentLang = await get(currentLangAtom);

  try {
    return await createLocalized(currentLang);
  } catch (e) {
    console.error("Failed to create localized function:", e);
    return await loadFallbackLocalized();
  }
});

export function useLocalized(): (code: string) => string {
  return useAtomValue(localizedAtom);
}
