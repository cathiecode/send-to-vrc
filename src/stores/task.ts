import { Getter, Setter, atom, useAtom } from "jotai";

export function createTaskAtom<T>(option?: {
  onTaskRequestCreated?: (get: Getter, set: Setter) => void;
}) {
  const baseAtom = atom<TaskRequest<T> | undefined>(undefined);

  return atom(
    (get) => get(baseAtom),
    (get, set, taskRequest: TaskRequest<T> | undefined) => {
      if (taskRequest) {
        option?.onTaskRequestCreated?.(get, set);
      }

      set(baseAtom, taskRequest);
    },
  );
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
