import { createContext, useContext } from "react";

type SwitchProps<T> = {
  value: T;
  children?: React.ReactNode;
};

type CaseProps<T> = {
  value: T;
  children?: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const switchValueContext = createContext<any>(null);

export default function Switch<T>(props: SwitchProps<T>) {
  return (
    <switchValueContext.Provider value={props.value}>
      {props.children}
    </switchValueContext.Provider>
  );
}

export function Case<T>(props: CaseProps<T>) {
  const switchValue = useContext(switchValueContext) as T;

  if (switchValue === props.value) {
    return <>{props.children}</>;
  }

  return null;
}
