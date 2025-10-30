import { useAtom, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { useCallback, useId } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { css } from "@emotion/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/layout/AppContainer";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Spacer } from "@/components/ui/Spacer";
import SpacerInline from "@/components/ui/SpacerInline";
import {
  vrchatCurrentUserNameAtom,
  vrchatLoginTaskAtom,
  vrchatLogoutTaskAtom,
} from "@/features/send-image/stores/vrchat-login";
import { configuredLangAtom, uploaderApiKeyAtom } from "@/stores/config";
import { useTaskRequestAtom } from "@/stores/task";
import { useLocalized } from "@/i18n";

export const Route = createFileRoute("/config")({
  component: RouteComponent,
});

const vrchatCurrentUserNameLoadable = loadable(vrchatCurrentUserNameAtom);

type Inputs = {
  uploaderApiKey: string;
  configuredLanguage: string;
};

function Config(props: { inputs: Inputs; onSubmit: (data: Inputs) => void }) {
  const { inputs, onSubmit } = props;
  const localized = useLocalized();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<Inputs>({
    defaultValues: inputs,
  });

  const vrchatLoginTask = useTaskRequestAtom(vrchatLoginTaskAtom);
  const vrchatLogoutTask = useTaskRequestAtom(vrchatLogoutTaskAtom);
  const vrchatCurrentUserName = useAtomValue(vrchatCurrentUserNameLoadable);

  const uploaderApiKeyId = useId();
  const vrchatApiKeyId = useId();
  const languageId = useId();

  const userName = (() => {
    if (vrchatCurrentUserName.state === "loading") {
      return localized("vrchat-login.username.status.loading-username");
    }

    if (vrchatCurrentUserName.state === "hasError") {
      return localized("vrchat-login.username.status.error");
    }

    if (vrchatCurrentUserName.data === undefined) {
      return localized("vrchat-login.username.status.not-logged-in");
    }

    return vrchatCurrentUserName.data;
  })();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div
        css={css`
          display: grid;
          gap: 0.5em;
          grid-template-columns: max-content 1fr;
          line-height: 2em;
        `}
      >
        <label htmlFor={uploaderApiKeyId}>
          {localized("send.uploader-api-key")}
        </label>
        <div>
          <Input id={uploaderApiKeyId} {...register("uploaderApiKey")} />
        </div>
        <label htmlFor={vrchatApiKeyId}>
          {localized("vrchat-login.api-key")}
        </label>
        <div id={vrchatApiKeyId}>
          <div>{userName}</div>
          <Button
            type="button"
            variant="primary"
            onClick={() => vrchatLoginTask.request(console.log, console.error)}
          >
            {localized("vrchat-login.login")}
          </Button>
          <SpacerInline size="0.5em" />
          <Button
            type="button"
            variant="secondary"
            onClick={() => vrchatLogoutTask.request(console.log, console.error)}
          >
            {localized("vrchat-login.logout")}
          </Button>
        </div>
        <label htmlFor={languageId}>Language</label>
        <div>
          <Select id={languageId} {...register("configuredLanguage")}>
            <option value="SYSTEM">System Default</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </Select>
        </div>
      </div>
      <Spacer size="0.5em" />
      {isDirty ? (
        <Button type="submit" disabled={!isDirty}>
          {localized("config.save-changes")}
        </Button>
      ) : null}
    </form>
  );
}

function RouteComponent() {
  const [uploaderApiKey, setUploaderApiKey] = useAtom(uploaderApiKeyAtom);
  const [configuredLanguage, setConfiguredLanguage] =
    useAtom(configuredLangAtom);
  const localized = useLocalized();

  const inputs = {
    uploaderApiKey: uploaderApiKey ?? "",
    configuredLanguage: configuredLanguage ?? "SYSTEM",
  };

  const inputKey = JSON.stringify(inputs);

  const onSubmit: SubmitHandler<Inputs> = useCallback(
    (data) => {
      setUploaderApiKey(data.uploaderApiKey);
      setConfiguredLanguage(data.configuredLanguage);
    },
    [setConfiguredLanguage, setUploaderApiKey],
  );

  return (
    <AppLayout>
      <Container>
        <Config key={inputKey} inputs={inputs} onSubmit={onSubmit} />
        <Spacer size="0.5em" />
        <Link to="/about">
          <Button variant="secondary">
            {localized("about.open-about-page")}
          </Button>
        </Link>
        <SpacerInline size="0.5em" />
        <a href="/recovery.html">
          <Button variant="secondary">{localized("open-recovery-page")}</Button>
        </a>
      </Container>
    </AppLayout>
  );
}
