import { useAtomValue } from "jotai";
import { appStateAtom } from "./atoms";
import Switch, { Case } from "./Switch";
import SendMode from "./SendMode";
import MainMode from "./MainMode";
import { Suspense } from "react";
import AboutMode from "./AboutMode";
import FileDrop from "./FileDrop";

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
        <Case value="about">
          <AboutMode />
        </Case>
      </Switch>
      <FileDrop />
    </Suspense>
  );
}

export default App;
