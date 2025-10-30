function parseArgs(args) {
  const program = args[0];

  let mode = undefined;

  if (args[1] !== undefined) {
    mode = "send";
  } else if (args[1] === "send") {
    mode = "send";
  }

  const fileToSend = mode === "send" ? args[1] : undefined;

  return {
    program,
    mode,
    fileToSend,
  };
}

async function main() {
  try {
    const args = await window.__TAURI__.core.invoke("get_args");

    console.log("Launch args:", args);

    const options = parseArgs(args);

    console.log(options);

    if (options.mode === "send") {
      if (!options.fileToSend) {
        throw new Error("fileToSend is required in send mode");
      }

      if (!window.location.href.endsWith("/send")) {
        window.location.href = "/send";
      }
    }

    if (options.mode === undefined) {
      if (!window.location.href.endsWith("/")) {
        window.location.href = "/";
      }
    }
  } catch (e) {
    console.error("Error during launch:", e);
    window.location.href = "/error.html";
  }
}

main();
