import HeroImage from "@/components/ui/HeroImage";
import { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "SendToVRC/HeroImage",
  component: HeroImage,
} satisfies Meta<typeof HeroImage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src: "https://avatars.githubusercontent.com/u/25481588?s=200&v=4",
    width: "10em",
    height: "10em",
  },
};
