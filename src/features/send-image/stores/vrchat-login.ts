import { produce } from "immer";
import { Getter, Setter, atom } from "jotai";
import { vrchatApiKeyAtom } from "@/stores/config";
import { createTaskAtom } from "@/stores/task";
import { commands } from "@/bindings.gen";

type VRChatLoginState = {
  username: string;
  password: string;
  totpCodeState?: "idle" | "loading" | "error";
} & (
  | {
      step: "idle" | "error" | "loading";
    }
  | {
      step: "otp";
      type: "emailOtp" | "totp";
      code: string;
      totpCodeState: "idle" | "loading" | "error";
    }
  | {
      step: "finish";
    }
  | {
      step: "cancelled";
    }
);

type VRChatLoginAction =
  | {
      type: "setUsername";
      username: string;
    }
  | {
      type: "setPassword";
      password: string;
    }
  | {
      type: "loginSucceeded";
    }
  | {
      type: "loginFailed";
    }
  | {
      type: "otpRequired";
      otpType: "emailOtp" | "totp";
    }
  | {
      type: "otpFailed";
    }
  | {
      type: "submit";
    }
  | {
      type: "setOtpCode";
      code: string;
    }
  | {
      type: "submitCode";
    }
  | {
      type: "cancel";
    }
  | {
      type: "otpCancel";
    };

type Effect = (
  dispatch: (action: VRChatLoginAction) => void,
  get: Getter,
  set: Setter,
) => void;

function stateMachine(
  state: VRChatLoginState,
  action: VRChatLoginAction,
): [VRChatLoginState, Effect | undefined] {
  let effect: Effect | undefined = undefined;

  const nextState = produce<VRChatLoginState>((draft) => {
    if (action.type === "cancel") {
      draft.step = "cancelled";
      draft.username = "";
      draft.password = "";
      return;
    }

    switch (draft.step) {
      case "idle":
      case "error":
        switch (action.type) {
          case "setUsername":
            draft.username = action.username;
            return;
          case "setPassword":
            draft.password = action.password;
            return;
          case "submit": {
            draft.step = "loading";
            // NOTE: We can't access draft in effect, so we need to copy values here.
            const username = draft.username;
            const password = draft.password;
            effect = async (dispatch, _get, set) => {
              console.log(username, password);
              const loginResult = await commands.loginToVrchat(
                username,
                password,
              );

              if (loginResult.status === "error") {
                console.error(loginResult);
                dispatch({ type: "loginFailed" });
                return;
              }

              if (loginResult.data.type === "RequiresTwoFactorAuth") {
                dispatch({
                  type: "otpRequired",
                  otpType: loginResult.data.content.includes("Totp")
                    ? "totp"
                    : "emailOtp",
                });
                return;
              }

              set(vrchatApiKeyAtom);

              dispatch({
                type: "loginSucceeded",
              });
              return;
            };
            return;
          }
        }
        return;
      case "loading":
        switch (action.type) {
          case "loginSucceeded":
            return {
              ...draft,
              step: "finish",
            };
          case "loginFailed":
            draft.step = "error";
            return;
          case "otpRequired":
            return {
              ...draft,
              step: "otp",
              type: action.otpType,
              code: "",
              totpCodeState: "idle",
            };
        }
        return;
      case "otp":
        switch (action.type) {
          case "setOtpCode":
            draft.code = action.code;
            return;
          case "submitCode": {
            draft.totpCodeState = "loading";

            const code = draft.code;
            const type = draft.type;
            effect = async (dispatch, _get, set) => {
              let result;
              if (type === "totp") {
                result = await commands.loginToVrchatSubmitTotpCode(code);
              } else if (type === "emailOtp") {
                result = await commands.loginToVrchatSubmitTotpCode(code);
              } else {
                console.error("Unknown OTP type: " + type);
                dispatch({ type: "otpFailed" });
                return;
              }

              if (result.status === "error") {
                console.error(result);
                dispatch({ type: "otpFailed" });
                return;
              }

              set(vrchatApiKeyAtom);

              dispatch({ type: "loginSucceeded" });
            };
            return;
          }
          case "loginSucceeded":
            return {
              step: "finish",
              username: "",
              password: "",
            };
          case "otpCancel": {
            return {
              step: "idle",
              username: draft.username,
              password: draft.password,
            };
          }
          case "otpFailed": {
            draft.totpCodeState = "error";
            return;
          }
        }
        return;
      case "finish":
        return;
    }
  })(state);

  return [nextState, effect];
}

const vrchatLoginStateAtom = atom<VRChatLoginState>({
  step: "idle",
  username: "",
  password: "",
});

export const vrchatLoginAtom = atom(
  (get) => get(vrchatLoginStateAtom),
  (get, set, action: VRChatLoginAction) => {
    const state = get(vrchatLoginStateAtom);
    const [nextState, effect] = stateMachine(state, action);

    const runEffect = (effect: Effect) => {
      const dispatch = (action: VRChatLoginAction) => {
        const [nextState, effect] = stateMachine(
          get(vrchatLoginStateAtom),
          action,
        );
        set(vrchatLoginStateAtom, nextState);

        if (effect) {
          runEffect(effect);
        }
      };

      effect(dispatch, get, set);
    };

    if (effect) {
      runEffect(effect);
    }

    set(vrchatLoginStateAtom, nextState);
  },
);

export const vrchatLoginTaskAtom = createTaskAtom<void>({
  onTaskRequestCreated(_get, set) {
    set(vrchatLoginStateAtom, {
      step: "idle",
      username: "",
      password: "",
    });
  },
});

export const vrchatLogoutTaskAtom = createTaskAtom<void>({
  async onTaskRequestCreated(_get, set) {
    const result = await commands.logoutFromVrchat();

    if (result.status === "error") {
      throw new Error(
        "Failed to logout from VRChat: " +
          result.error.type +
          " - " +
          result.error.message,
      );
    }

    set(vrchatApiKeyAtom);
  },
});

export const vrchatCurrentUserNameAtom = atom(async (get) => {
  console.log("vrchatCurrentUserNameAtom: fetching current user name");
  get(vrchatApiKeyAtom); // Dependency tracking

  const result = await commands.loginToVrchatGetCurrentUserName();

  if (result.status === "error") {
    if (result.error.type === "VrchatAuthRequired") {
      return undefined;
    }

    throw new Error("Failed to get current user name: " + result.error);
  }

  console.log("vrchatCurrentUserNameAtom: fetched user name:", result.data);

  return result.data;
});
