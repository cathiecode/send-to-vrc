import BoundingSelector from "@/BoundingSelector";
import { Meta, StoryObj } from "@storybook/react-vite";
import useBoundingSelectorState from "@/useBoundingSelectorState";

function BoundingSelectorProxy(
  props: Omit<
    React.ComponentProps<typeof BoundingSelector>,
    "state" | "dispatch"
  >,
) {
  const [state, dispatch] = useBoundingSelectorState();

  return <BoundingSelector {...props} state={state} dispatch={dispatch} />;
}

const meta = {
  title: "SendToVRC/BoundingSelector",
  component: BoundingSelectorProxy,
} satisfies Meta<typeof BoundingSelectorProxy>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    width: "400px",
    height: "300px",
  },
};
