import { StoryObj } from "@storybook/react-vite";
import GraphicButton from "@/components/ui/GraphicButton";

const meta = {
  title: "SendToVRC/GraphicButton",
  component: GraphicButton,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "タイトル",
    description: "ここに説明が入ります",
    background: "linear-gradient(135deg, #4557a8ff 0%, #8f4ad3ff 100%)",
  },
};
