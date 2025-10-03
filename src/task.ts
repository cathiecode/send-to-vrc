import { atom, useAtom } from "jotai";

export function createTaskAtom<T>() {
  return atom<TaskRequest<T> | undefined>();
}

type TaskRequest<T> = {
  resolve: (value: T) => void;
  reject: (e: unknown) => void;
};

type TaskRequestAtom<T> = ReturnType<typeof createTaskAtom<T>>;

export function useTaskRequestAtom<T>(taskAtom: TaskRequestAtom<T>) {
  const [taskRequest, setTaskRequets] = useAtom(taskAtom);

  return {
    exists: !!taskRequest,
    resolve: (value: T) => {
      taskRequest?.resolve(value);
      setTaskRequets(undefined);
    },
    reject: (e: unknown) => {
      taskRequest?.reject(e);
      setTaskRequets(undefined);
    },
    request: (resolve: (value: T) => void, reject: (e: unknown) => void) => {
      setTaskRequets({ resolve, reject });
    },
  };
}
