import { useAtomValue } from "jotai";
import { useLayoutEffect } from "react";
import { currentLangAtom } from "./i18n";

export default function RewriteLangTag() {
  const currentLang = useAtomValue(currentLangAtom);

  useLayoutEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  return null;
}
