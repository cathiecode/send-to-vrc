import { TbAbc } from "react-icons/tb";
import { StoryObj } from "@storybook/react-vite";
import ButtonCard from "@/components/ui/ButtonCard";

const meta = {
  title: "SendToVRC/ButtonCard",
  component: ButtonCard,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <TbAbc />,
    title: "Button Card Title",
    description:
      "This is a description of the button card. It provides additional information about the button's purpose.",
  },
};
