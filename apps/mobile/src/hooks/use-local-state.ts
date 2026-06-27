import { useQuery, useQueryClient } from "@tanstack/react-query";

type LocalStateUpdater<T> = T | ((prev: T) => T);

export function useLocalState<T>(key: string | readonly unknown[], initialValue: T) {
  const queryClient = useQueryClient();
  const queryKey = typeof key === "string" ? [key] : key;

  const { data } = useQuery<T>({
    queryKey,
    queryFn: () => initialValue,
    initialData: initialValue,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setValue = (newValue: LocalStateUpdater<T>) => {
    queryClient.setQueryData(queryKey, (prev: T | undefined) => {
      const resolvedPrev = prev === undefined ? initialValue : prev;
      return typeof newValue === "function" ? (newValue as (prev: T) => T)(resolvedPrev) : newValue;
    });
  };

  return [data as T, setValue] as const;
}
