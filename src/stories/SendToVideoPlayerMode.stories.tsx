import { Meta, StoryObj } from "@storybook/react-vite";
import SendToVideoPlayerMode from "@/SendToVideoPlayerMode";

const meta = {
  title: "SendToVRC/SendToVideoPlayerMode",
  component: SendToVideoPlayerMode,
} satisfies Meta<typeof SendToVideoPlayerMode>;

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
