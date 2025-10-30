import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { css } from "@emotion/react";
import Button from "@/components/ui/Button";
import Overlay from "@/components/ui/Overlay";
import { registerRequestAtom } from "@/stores/atoms";
import { uploaderApiKeyAtom, uploaderUrlBaseAtom } from "@/stores/config";
import { useTaskRequestAtom } from "@/stores/task";
import { commands } from "@/bindings.gen";
import { useLocalized } from "@/i18n";
import StatusLineComponent from "./StatusLineComponent";

function RegisterOverlayContents() {
  const taskRequest = useTaskRequestAtom(registerRequestAtom);
  const localized = useLocalized();
  const uploaderUrlBase = useAtomValue(uploaderUrlBaseAtom);
  const setUploaderApiKey = useSetAtom(uploaderApiKeyAtom);

  const { data: tos } = useSWR([uploaderUrlBase, "tos"], async () => {
    return await commands.getTosAndVersion(uploaderUrlBase);
  });

  const tosContent = useMemo(() => {
    if (tos?.status !== "ok") {
      return undefined;
    }

    return tos.data.content
      .split("\n")
      .flatMap((line, i) => [line, <br key={`br-${i}`} />]);
  }, [tos]);

  const onAcceptClick = useCallback(async () => {
    if (tos?.status !== "ok") {
      return;
    }

    const result = await commands.registerAnonymously(
      tos.data.version,
      uploaderUrlBase,
    );

    if (result.status === "error") {
      taskRequest?.reject(
        new Error(`${localized("send.tos.error.failed")}: ${result.error}`),
      );
      return;
    }

    const apiKey = result.data;

    await setUploaderApiKey(apiKey);

    taskRequest?.resolve();
  }, [tos, uploaderUrlBase, setUploaderApiKey, taskRequest, localized]);

  const onRejectClick = useCallback(() => {
    taskRequest?.reject(new Error(localized("send.tos.error.denied")));
  }, [taskRequest, localized]);

  if (tos?.status === "error") {
    return (
      <div>
        <div>{localized("send.tos.failed-to-load")}</div>
        <div>
          <Button onClick={onRejectClick}>
            {localized("send.tos.failed-to-load.back")}
          </Button>
        </div>
      </div>
    );
  }

  if (!tos) {
    return (
      <div
        css={css`
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
      >
        <StatusLineComponent
          status="pending"
          statusText={localized("send.tos.loading")}
        />
      </div>
    );
  }

  return (
    <div>
      <div
        css={css`
          margin-bottom: 2em;
        `}
      >
        {localized("send.tos.description")}
      </div>
      <div
        css={css`
          flex: 1 1 100%;
          height: 20em;
          overflow-y: scroll;
          margin-bottom: 2em;
          background-color: #eee;
          padding: 1em;
        `}
      >
        {tosContent !== undefined ? tosContent : null}
      </div>
      <div
        css={css`
          display: flex;
          gap: 1em;
          justify-content: flex-end;
        `}
      >
        <Button variant="secondary" onClick={onRejectClick}>
          {localized("send.tos.deny")}
        </Button>
        <Button onClick={onAcceptClick}>{localized("send.tos.accept")}</Button>
      </div>
    </div>
  );
}

export default function RegisterOverlay() {
  const taskRequest = useTaskRequestAtom(registerRequestAtom);

  if (!taskRequest.exists) {
    return null;
  }

  return (
    <Overlay>
      <RegisterOverlayContents />
    </Overlay>
  );
}
