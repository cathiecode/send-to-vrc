import { css } from "@emotion/react";
import NavigationBar from "@/components/navigation/NavigationBar";
import FileDrop from "@/features/file/FileDrop";
import RegisterOverlay from "@/features/send-image/RegisterOverlay";
import VRChatLoginOverlay from "@/features/send-image/VRChatLoginOverlay";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout(props: AppLayoutProps) {
  const { children } = props;

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        min-height: 100vh;
      `}
    >
      <NavigationBar />
      {children}
      <FileDrop />
      <RegisterOverlay />
      <VRChatLoginOverlay />
    </div>
  );
}
