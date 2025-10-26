import { TbExternalLink } from "react-icons/tb";
import useSWR from "swr";
import { css } from "@emotion/react";
import { createFileRoute } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import AppLayout from "@/components/layout/AppContainer";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Logo from "@/assets/logo.png";
import { useLocalized } from "@/i18n";
import { openResourceDir } from "@/ipc";
import { lfToBr } from "@/utils";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const { data: version } = useSWR(
    "version",
    async () => {
      return await getVersion();
    },
    { suspense: true },
  );

  const localized = useLocalized();

  return (
    <AppLayout>
      <Container>
        <div
          css={css`
            text-align: center;
          `}
        >
          <img
            css={css`
              background-color: #fff;
              border-radius: 50%;
              padding: 0.5em;
            `}
            src={Logo}
            alt=""
            width="128"
            height="128"
          />
        </div>
        <h1
          css={css`
            text-align: center;
          `}
        >
          Send to VRC {version}
        </h1>
        <div
          css={css`
            text-align: center;
          `}
        >
          <a
            href="http://github.com/cathiecode/send-to-vrc"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
        <p>{lfToBr(localized("about.description"))}</p>
        <h2>{localized("about.author")}</h2>
        <p>
          Catherine キャサリン (
          <a
            href="https://github.com/cathiecode"
            target="_blank"
            rel="noopener noreferrer"
          >
            @cathiecode
          </a>
          )
        </p>
        <h2>{localized("about.thirdparty-license")}</h2>
        <p>
          {localized("about.thirdparty-license.description")}
          <div>
            <Button variant="secondary" onClick={openResourceDir}>
              <TbExternalLink /> {localized("open-resource-folder")}
            </Button>
          </div>
        </p>
        <h2>{localized("about.notice")}</h2>
        <p>{lfToBr(localized("about.notice.description"))}</p>
        <h2>{localized("about.misc")}</h2>
        <a href="/recovery.html">
          <Button variant="secondary">{localized("open-recovery-page")}</Button>
        </a>
      </Container>
    </AppLayout>
  );
}
