import { Meta, StoryObj } from "@storybook/react";
import LimitedText from "@/LimitedText";

const meta = {
  title: "SendToVRC/LimitedText",
  component: LimitedText,
} satisfies Meta<typeof LimitedText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children:
      "これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。",
  },
};

export const ShortText: Story = {
  args: {
    children: "短いテキスト",
  },
};

export const WithWidth: Story = {
  args: {
    children:
      "これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。これはとても長いテキストです。",
  },
  decorators: [
    (Story) => (
      <>
        これはとても長いテキストの前座です。これはとても長いテキストの前座です。
        <Story />
        これは長いテキストのあとがきです。このテキストは省略され
      </>
    ),
  ],
};
