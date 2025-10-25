import { css } from "storybook/internal/theming";
import Switch, { Case } from "@/components/ui/Switch";
import { TbCheck, TbLoader2, TbX } from "react-icons/tb";

type StatusLineComponentProps = {
  statusText: string;
  status: "pending" | "success" | "error";
};

export default function StatusLineComponent(props: StatusLineComponentProps) {
  const { statusText, status } = props;

  return (
    <div
      css={css`
        position: relative;
        padding-left: 2em;
      `}
    >
      <Switch value={status}>
        <Case value="pending">
          <TbLoader2
            css={css`
              display: block;
              position: absolute;
              left: 0;
              top: 0;
              animation: spin 0.5s linear infinite;
              width: 1lh;
              height: 1lh;

              @keyframes spin {
                from {
                  transform: rotate(0deg);
                }
                to {
                  transform: rotate(360deg);
                }
              }
            `}
          />
        </Case>
        <Case value="success">
          <TbCheck
            css={css`
              display: block;
              position: absolute;
              left: 0;
              top: 0;
              width: 1lh;
              height: 1lh;
              color: #3c3;
            `}
          />
        </Case>
        <Case value="error">
          <TbX
            css={css`
              display: block;
              position: absolute;
              left: 0;
              top: 0;
              width: 1lh;
              height: 1lh;
              color: #d33;
            `}
          />
        </Case>
      </Switch>
      <div>{statusText}</div>
    </div>
  );
}
