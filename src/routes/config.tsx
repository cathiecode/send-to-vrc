import { configAtom } from "@/atoms";
import Container from "@/Container";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { FormEvent, useCallback, useState } from "react";

export const Route = createFileRoute("/config")({
  component: RouteComponent,
});

function RouteComponent() {
  const [config, setConfig] = useAtom(configAtom);

  const [configDraft, setConfigDraft] = useState(config);

  const onSubmit = useCallback(
    async (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault();
      await setConfig(configDraft);
      return false;
    },
    [configDraft],
  );

  return (
    <Container>
      <form onSubmit={onSubmit}>
        APIキー
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
  );
}
