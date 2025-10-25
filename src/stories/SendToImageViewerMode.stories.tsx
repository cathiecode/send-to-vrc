import { Meta, StoryObj } from "@storybook/react-vite";
import SendToVideoViewerMode from "@/features/send-image/SendToImageViewerMode";

const meta = {
  title: "SendToVRC/SendToVideoViewerMode",
  component: SendToVideoViewerMode,
} satisfies Meta<typeof SendToVideoViewerMode>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Uploading: Story = {
  args: {
    state: {
      status: "uploading",
    },
  },
};

export const Uploaded: Story = {
  args: {
    state: {
      status: "done",
      url: "https://example.superneko.net/9m9uao70-4061-4fb4-a699-aou09gauhn.mp4",
    },
  },
};

export const UploadFailed: Story = {
  args: {
    state: {
      status: "error",
      message: "ネットワークエラー",
    },
  },
};
