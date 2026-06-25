import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useLocalState<T>(key: string | any[], initialValue: T) {
  const queryClient = useQueryClient();
  const queryKey = typeof key === "string" ? [key] : key;

  const { data } = useQuery<T>({
    queryKey,
    queryFn: () => initialValue,
    initialData: initialValue,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const setValue = (newValue: T | ((prev: T) => T)) => {
    queryClient.setQueryData(queryKey, (prev: T | undefined) => {
      const resolvedPrev = prev === undefined ? initialValue : prev;
      return typeof newValue === "function" ? (newValue as Function)(resolvedPrev) : newValue;
    });
  };

  return [data as T, setValue] as const;
}
