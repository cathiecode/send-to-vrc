import { useAtom } from "jotai";
import { FormEvent, useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppContainer";
import Container from "@/components/layout/Container";
import { configAtom } from "@/stores/atoms";
import { useLocalized } from "@/i18n";

export const Route = createFileRoute("/config")({
  component: RouteComponent,
});

function RouteComponent() {
  const [config, setConfig] = useAtom(configAtom);

  const [configDraft, setConfigDraft] = useState(config);
  const localized = useLocalized();

  const onSubmit = useCallback(
    async (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      await setConfig(configDraft);
      return false;
    },
    [configDraft, setConfig],
  );

  return (
    <AppLayout>
      <Container>
        <form onSubmit={onSubmit}>
          {localized("config.api-key")}
          <input
            type="text"
            value={configDraft.uploaderApiKey}
            onChange={(ev) => {
              const uploaderApiKey = ev.currentTarget.value;
              setConfigDraft((c) => ({ ...c, uploaderApiKey }));
            }}
          />
        </form>
      </Container>
    </AppLayout>
  );
}
