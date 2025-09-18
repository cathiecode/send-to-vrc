type Options = {
  program: string;
  mode?: "send";
  fileToSend?: string;
};

export function parseArgs(args: string[]): Options {
  const program = args[0];

  let mode: "send" | undefined = undefined;

  if (args[1] !== undefined) {
    mode = "send";
  }

  const fileToSend = mode === "send" ? args[1] : undefined;

  return {
    program,
    mode,
    fileToSend,
  };
}
