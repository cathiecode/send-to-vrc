import { useAtomValue } from "jotai";
import { appStateAtom } from "./atoms";
import Switch, { Case } from "./Switch";
import SendMode from "./SendMode";
import MainMode from "./MainMode";
import { Suspense } from "react";
import DebugMode from "./DebugMode";

function App() {
  const appState = useAtomValue(appStateAtom);

  return (
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
  );
}

export default App;
