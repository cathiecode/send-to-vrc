import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { TbUpload } from "react-icons/tb";
import { css } from "@emotion/react";
import { setFileToSendAtom } from "@/stores/atoms";
import { useLocalized } from "@/i18n";
import { useFileOpenRequest } from "./file-handler";

export default function FileDrop() {
  const setFileToSend = useSetAtom(setFileToSendAtom);
  const localized = useLocalized();

  const onDrop = useCallback(
    (filePath: string) => {
      console.log("File dropped:", filePath);
      setFileToSend(filePath);
    },
    [setFileToSend],
  );

  const { isOver } = useFileOpenRequest({
    onDropHandler: onDrop,
  });

  if (!isOver) {
    return null;
  }

  return (
    <div
      css={css`
        position: fixed;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        color: #fff;
        background-color: #0009;
      `}
    >
      <div
        css={css`
          font-size: 2em;
        `}
      >
        <TbUpload />
      </div>
      {localized("send.drop.description")}
    </div>
  );
}
