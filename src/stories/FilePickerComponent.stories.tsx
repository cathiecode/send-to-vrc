import FilePickerComponent from "../FilePickerComponent";
import { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "SendToVRC/FilePickerComponent",
  component: FilePickerComponent,
} satisfies Meta<typeof FilePickerComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Valid: Story = {
  args: {
    pickedFileValidity: "valid",
    onOpenClicked: () => {},
  }
}

export const Invalid: Story = {
  args: {
    pickedFileValidity: "invalid",
    onOpenClicked: () => {},
  }
}

export const Pending: Story = {
  args: {
    pickedFileValidity: "pending",
    onOpenClicked: () => {},
  }
}
