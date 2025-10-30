import { useAtom } from "jotai";
import { useEffect, useId } from "react";
import { css } from "@emotion/react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Overlay from "@/components/ui/Overlay";
import { Spacer } from "@/components/ui/Spacer";
import SpacerInline from "@/components/ui/SpacerInline";
import { useTaskRequestAtom } from "@/stores/task";
import { useLocalized } from "@/i18n";
import StatusLineComponent from "./StatusLineComponent";
import { vrchatLoginAtom, vrchatLoginTaskAtom } from "./stores/vrchat-login";

export default function VRChatLoginOverlay() {
  const localized = useLocalized();
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
      {localized("vrchat-login.please-login-to-vrchat")}
      <Spacer size="0.5em" />
      {showLoginForm ? (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            dispatch({ type: "submit" });
            return false;
          }}
        >
          <div
            css={css`
              display: grid;
              grid-template-columns: auto 1fr;
              grid-template-rows: auto;
              gap: 0.5em;
            `}
          >
            <label htmlFor={usernameId}>
              {localized("vrchat-login.username")}:
            </label>
            <Input
              type="text"
              autoComplete="off"
              placeholder={localized("vrchat-login.username.placeholder")}
              value={state.username}
              readOnly={isUsernameAndPasswordReadOnly}
              id={usernameId}
              onChange={(e) =>
                dispatch({ type: "setUsername", username: e.target.value })
              }
            />
            <label htmlFor={passwordId}>
              {localized("vrchat-login.password")}:
            </label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={localized("vrchat-login.password.placeholder")}
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
              type="button"
              variant="secondary"
              onClick={() => dispatch({ type: "cancel" })}
            >
              {localized("vrchat-login.cancel")}
            </Button>
            <SpacerInline size="0.25em" />
            <Button>{localized("vrchat-login.login")}</Button>
            <SpacerInline size="1em" />
            <div
              css={css`
                display: inline-block;
              `}
            >
              {state.step === "loading" ? (
                <StatusLineComponent
                  statusText={localized("vrchat-login.status.logging-in")}
                  status="pending"
                />
              ) : state.step === "error" ? (
                <StatusLineComponent
                  statusText={localized("vrchat-login.status.failed")}
                  status="error"
                />
              ) : null}
            </div>
          </div>
        </form>
      ) : null}
      {showOtpForm ? (
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            dispatch({ type: "submitCode" });
            return false;
          }}
        >
          {state.type === "emailOtp"
            ? localized("vrchat-login.otp.enter-from-email")
            : localized("vrchat-login.otp.enter-from-authenticator-app")}
          <Spacer size="0.5em" />
          <div
            css={css`
              display: grid;
              grid-template-columns: auto 1fr;
              grid-template-rows: auto;
              gap: 0.5em;
            `}
          >
            <label htmlFor={otpCodeId}>
              {localized("vrchat-login.otp.code")}:
            </label>
            <Input
              type="text"
              autoComplete="off"
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
              type="button"
              variant="secondary"
              onClick={() => dispatch({ type: "otpCancel" })}
            >
              {localized("vrchat-login.otp.cancel")}
            </Button>
            <SpacerInline size="0.5em" />
            <Button>{localized("vrchat-login.otp.verify")}</Button>
            <SpacerInline size="1em" />
            {state.totpCodeState === "loading" ? (
              <StatusLineComponent
                statusText={localized("vrchat-login.otp.status.verifying")}
                status="pending"
              />
            ) : state.totpCodeState === "error" ? (
              <StatusLineComponent
                statusText={localized("vrchat-login.otp.status.failed")}
                status="error"
              />
            ) : null}
          </div>
        </form>
      ) : null}
    </Overlay>
  );
}
