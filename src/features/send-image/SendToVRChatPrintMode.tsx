import { css } from "@emotion/react";
import { VRChatPrintSendState } from "@/stores/atoms";
import StatusLineComponent from "./StatusLineComponent";
import { useProgressMessage } from "./useProgressMessage";
import { useMemo } from "react";
import { useLocalized } from "@/i18n";
import Button from "@/components/ui/Button";
import router from "@/stores/router";

type SendToVRChatPrintModeProps = {
  state: VRChatPrintSendState;
};

export default function SendToVRChatPrintMode(
  props: SendToVRChatPrintModeProps,
) {
  const { state } = props;

  const progressMessage = useProgressMessage();
  const localized = useLocalized();

  const displayProgressMessage = useMemo(() => {
    switch (progressMessage) {
      case "Starting":
        return localized("send.print-to-vrchat-print.started");
      case "Compressing":
        return localized("send.print-to-vrchat-print.compressing");
      case "Uploading":
        return localized("send.print-to-vrchat-print.uploading");
      default:
        return localized("send.print-to-vrchat-print.starting");
    }
  }, [progressMessage, localized]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25em;
      `}
    >
      {(() => {
        switch (state.status) {
          case "uploading":
            return (
              <StatusLineComponent
                status="pending"
                statusText={displayProgressMessage}
              />
            );
          case "done":
            return (
              <>
                <StatusLineComponent
                  status="success"
                  statusText={localized("send.print-to-vrchat-print.succeeded")}
                />
                <div>
                  {localized("send.print-to-vrchat-print.share-instruction")}
                </div>
                <Button
                  variant="primary"
                  css={css`
                    margin-top: 0.5em;
                  `}
                  onClick={() => {
                    router.navigate({ href: "/", replace: true });
                  }}
                >
                  {localized("send.back-to-home")}
                </Button>
              </>
            );
          case "error":
            return (
              <StatusLineComponent
                status="error"
                statusText={`${localized("send.print-to-vrchat-print.failed")}(${state.message})`}
              />
            );
        }
      })()}
    </div>
  );
}
