import { Meta, StoryObj } from "@storybook/react-vite";
import SendPageComponent from "@/features/send-image/SendPageComponent";

const meta = {
  title: "SendToVRC/SendPageComponent",
  component: SendPageComponent,
  decorators: [
    (Story) => (
      <div style={{ display: "flex", height: "800px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SendPageComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultArgs = {
  sendState: undefined,
  pickedFilePath: undefined,
  imageFileSrc: undefined,
  imageValidity: "pending",
  shouldCopyAfterUpload: true,
  vrchatPrint: false,
  onFilePicked: (_filePath: string | undefined) => {},
  onSendToVideoPlayerClicked: () => {},
  onSendToImageViewerClicked: () => {},
  onSendToVrchatPrintClicked: () => {},
} as const;

export const Default: Story = {
  args: {
    ...defaultArgs,
  },
};

export const UploadingImage: Story = {
  args: {
    ...defaultArgs,
    sendState: { mode: "image_viewer", state: { status: "uploading" } },
  },
};
