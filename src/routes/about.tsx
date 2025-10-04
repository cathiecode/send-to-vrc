import { TbExternalLink } from "react-icons/tb";
import Button from "@/Button";
import { openResourceDir } from "@/ipc";
import { css } from "@emotion/react";
import { createFileRoute } from "@tanstack/react-router";
import Container from "@/Container";
import Logo from "@/assets/logo.png";
import useSWR from "swr";
import { getVersion } from "@tauri-apps/api/app";

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

  return (
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
      <p>
        Send to
        VRCは無料のオープンソースソフトウェアで、VRChatで画像を簡単に共有するためのツールです。
        <br />
        画像は、VRChatで表示できる形式に変換され、クラウドサービスにアップロードされます。
        <br />
        アップロードされた画像のURLをクリップボードにコピーし、VRChat内の動画プレイヤーや画像ビューアに貼り付けて表示できます。
        <br />
      </p>
      <h2>製作者</h2>
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
      <h2>サードパーティのライセンス</h2>
      <p>
        このソフトウェアは、様々なオープンソースソフトウェアにより構築されています。
        詳細については、licensesフォルダのファイルをご覧ください。
        <div>
          <Button variant="secondary" onClick={openResourceDir}>
            <TbExternalLink /> リソースフォルダを開く
          </Button>
        </div>
      </p>
      <h2>おことわり</h2>
      <p>
        Send To VRCはキャサリン
        Catherineにより作成されたソフトウェアであり、VRChat
        Inc.からの承認、認可、関与または推奨を受けるものではありません。VRChatはVRChat
        Inc.の登録商標です。
        <br />
        キャサリン Catherine及び本ソフトウェアの開発者はSend to
        VRCの使用に起因または関連するいかなる損害についても責任を負いません。
      </p>
      <h2>その他</h2>
      <a href="/recovery.html">
        <Button variant="secondary">リカバリページを開く</Button>
      </a>
    </Container>
  );
}
