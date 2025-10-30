import { createFileRoute } from "@tanstack/react-router";
import { vrchatLoginTaskAtom } from "@/features/send-image/stores/vrchat-login";
import { useTaskRequestAtom } from "@/stores/task";

export const Route = createFileRoute("/debug")({
  component: RouteComponent,
});

function RouteComponent() {
  const vrchatLoginTask = useTaskRequestAtom(vrchatLoginTaskAtom);

  return (
    <div>
      <button
        onClick={() => vrchatLoginTask.request(console.log, console.error)}
      >
        Login
      </button>
    </div>
  );
}
