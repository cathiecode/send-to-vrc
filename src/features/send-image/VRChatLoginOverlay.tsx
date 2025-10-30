import { useAtom } from "jotai";
import { useEffect, useId } from "react";
import { css } from "@emotion/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Overlay from "@/components/ui/Overlay";
import { Spacer } from "@/components/ui/Spacer";
import SpacerInline from "@/components/ui/SpacerInline";
import { useTaskRequestAtom } from "@/stores/task";
import StatusLineComponent from "./StatusLineComponent";
import { vrchatLoginAtom, vrchatLoginTaskAtom } from "./stores/vrchat-login";

export default function VRChatLoginOverlay() {
  const taskRequest = useTaskRequestAtom(vrchatLoginTaskAtom);

  const [state, dispatchLoginAction] = useAtom(vrchatLoginAtom);

  const dispatch = (action: Parameters<typeof dispatchLoginAction>[0]) => {
    dispatchLoginAction(action);
  };

  useEffect(() => {
    if (state.step === "cancelled") {
      taskRequest.reject(new Error("Login cancelled by user"));
    }
  }, [state, taskRequest]);

  useEffect(() => {
    if (state.step === "finish") {
      taskRequest.resolve();
    }
  }, [state, taskRequest]);

  const showLoginForm =
    state.step === "idle" || state.step === "error" || state.step === "loading";

  const showOtpForm = state.step === "otp";

  const isUsernameAndPasswordReadOnly =
    state.step === "loading" || state.step === "otp";

  const usernameId = useId();
  const passwordId = useId();
  const otpCodeId = useId();

  if (!taskRequest.exists) {
    return null;
  }

  return (
    <Overlay>
      VRChatにログイン
      <Spacer size="0.5em" />
      {showLoginForm ? (
        <div>
          <div
            css={css`
              display: grid;
              grid-template-columns: auto 1fr;
              grid-template-rows: auto;
              gap: 0.5em;
            `}
          >
            <label htmlFor={usernameId}>ユーザー名:</label>
            <Input
              type="text"
              placeholder="Username or Email"
              value={state.username}
              readOnly={isUsernameAndPasswordReadOnly}
              id={usernameId}
              onChange={(e) =>
                dispatch({ type: "setUsername", username: e.target.value })
              }
            />
            <label htmlFor={passwordId}>パスワード:</label>
            <Input
              type="password"
              placeholder="Password"
              value={state.password}
              readOnly={isUsernameAndPasswordReadOnly}
              id={passwordId}
              onChange={(e) =>
                dispatch({ type: "setPassword", password: e.target.value })
              }
            />
          </div>
          <Spacer size="0.25em" />
          <div
            css={css`
              display: flex;
              align-items: center;
              margin-top: 0.25em;
            `}
          >
            <Button
              variant="secondary"
              onClick={() => dispatch({ type: "cancel" })}
            >
              キャンセル
            </Button>
            <SpacerInline size="0.25em" />
            <Button onClick={() => dispatch({ type: "submit" })}>
              ログイン
            </Button>
            <SpacerInline size="1em" />
            <div
              css={css`
                display: inline-block;
              `}
            >
              {state.step === "loading" ? (
                <StatusLineComponent
                  statusText="ログインしています"
                  status="pending"
                />
              ) : state.step === "error" ? (
                <StatusLineComponent
                  statusText="ログインに失敗しました。"
                  status="error"
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {showOtpForm ? (
        <div>
          {state.type === "emailOtp"
            ? "メールで送信されたOTPコードを入力してください。"
            : "認証アプリで生成されたOTPコードを入力してください。"}
          <Spacer size="0.5em" />
          <div
            css={css`
              display: grid;
              grid-template-columns: auto 1fr;
              grid-template-rows: auto;
              gap: 0.5em;
            `}
          >
            <label htmlFor={otpCodeId}>OTPコード:</label>
            <Input
              type="text"
              placeholder="OTP Code"
              value={state.code}
              id={otpCodeId}
              onChange={(e) =>
                dispatch({ type: "setOtpCode", code: e.target.value })
              }
            />
          </div>
          <Spacer size="0.5em" />
          <div
            css={css`
              display: flex;
              align-items: center;
            `}
          >
            <Button
              variant="secondary"
              onClick={() => dispatch({ type: "otpCancel" })}
            >
              キャンセル
            </Button>
            <SpacerInline size="0.5em" />
            <Button onClick={() => dispatch({ type: "submitCode" })}>
              検証
            </Button>
            <SpacerInline size="1em" />
            {state.totpCodeState === "loading" ? (
              <StatusLineComponent
                statusText="検証しています"
                status="pending"
              />
            ) : state.totpCodeState === "error" ? (
              <StatusLineComponent
                statusText="検証に失敗しました"
                status="error"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </Overlay>
  );
}
