import ImageFilePickerComponent from "@/features/send-image/ImageFilePickerComponent";
import { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "SendToVRC/ImageFilePickerComponent",
  component: ImageFilePickerComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof ImageFilePickerComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Valid: Story = {
  args: {
    pickedFileValidity: "valid",
    height: "10em",
    onOpenClicked: () => {},
    imageSrc: "https://avatars.githubusercontent.com/u/25481588?s=200&v=4",
  },
};

export const Invalid: Story = {
  args: {
    pickedFileValidity: "invalid",
    height: "10em",
    onOpenClicked: () => {},
  },
};

export const Pending: Story = {
  args: {
    pickedFileValidity: "pending",
    height: "10em",
    onOpenClicked: () => {},
  },
};
