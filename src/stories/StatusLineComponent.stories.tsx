import StatusLineComponent from "../StatusLineComponent";
import { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "SendToVRC/StatusLineComponent",
  component: StatusLineComponent,
} satisfies Meta<typeof StatusLineComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: {
    status: "pending",
    statusText: "アップロード中..."
  }
};

export const Success: Story = {
  args: {
    status: "success",
    statusText: "アップロード成功"
  }
};

export const Error: Story = {
  args: {
    status: "error",
    statusText: "アップロード失敗"
  }
};