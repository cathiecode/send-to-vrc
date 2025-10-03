import { css } from "@emotion/react";
import { configAtom, registerRequestAtom } from "@/atoms";
import { useTaskRequestAtom } from "@/task";
import Button from "@/Button";
import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { commands } from "@/bindings.gen";
import StatusLineComponent from "./StatusLineComponent";
import { useAtom } from "jotai";

function RegisterOverlayContents() {
  const taskRequest = useTaskRequestAtom(registerRequestAtom);
  const [config, setConfig] = useAtom(configAtom);

  const { data: tos } = useSWR([config.uploaderUrlBase, "tos"], async () => {
    return await commands.getTosAndVersion(config.uploaderUrlBase);
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
      config.uploaderUrlBase,
    );

    if (result.status === "error") {
      taskRequest?.reject(new Error(`登録に失敗しました: ${result.error}`));
      return;
    }

    const apiKey = result.data;

    await setConfig({
      uploaderApiKey: apiKey,
    });

    taskRequest?.resolve();
  }, [taskRequest, config.uploaderUrlBase, setConfig]);

  const onRejectClick = useCallback(() => {
    taskRequest?.reject(new Error("アップローダーの規約に同意していません"));
  }, [taskRequest]);

  if (tos?.status === "error") {
    return (
      <div>
        <div>利用規約の読み込みに失敗しました。</div>
        <div>
          <Button onClick={onRejectClick}>戻る</Button>
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
          statusText="利用規約を読み込んでいます"
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
        アップローダーが以下の規約に同意することを要求しています。同意しますか？
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
          同意しない
        </Button>
        <Button onClick={onAcceptClick}>同意する</Button>
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
    <div
      css={css`
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.5);
      `}
    >
      <div
        css={css`
          width: calc(100vw - 6em);
          height: calc(100vh - 12em);
          background: white;
          padding: 1em;
          border-radius: 0.5em;
        `}
      >
        <RegisterOverlayContents />
      </div>
    </div>
  );
}
