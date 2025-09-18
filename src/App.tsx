import { useAtom, useAtomValue } from "jotai";
import { appStateAtom, fileToSendAtom, optionsAtom } from "./atoms";
import Switch, { Case } from "./Switch";
import SendMode from "./SendMode";
import MainMode from "./MainMode";
import { Suspense } from "react";
import DebugMode from "./DebugMode";
import { Container } from "@chakra-ui/react";

function App() {
  const options = useAtomValue(optionsAtom);

  const [appState, setAppState] = useAtom(appStateAtom);

  const fileToSend = useAtomValue(fileToSendAtom);

  return (
    <Container>
      <Suspense fallback={null}>
        <Switch value={appState.mode}>
          <Case value="main">
            <MainMode />
          </Case>
          <Case value="send">
            <SendMode />
          </Case>
          <Case value="config">
            <p>Config</p>
          </Case>
          <Case value="debug">
            <DebugMode />
          </Case>
        </Switch>
      </Suspense>
    </Container>
  );
}

export default App;
