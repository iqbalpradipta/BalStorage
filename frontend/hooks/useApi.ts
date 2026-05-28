"use client";

import useSWR, { SWRConfiguration } from "swr";

interface UseApiOptions<T> {
  key: string | [string, ...unknown[]] | null;
  fetcher: (...args: unknown[]) => Promise<T>;
  isCustomResponse?: boolean;
  customConfig?: SWRConfiguration;
}

interface UseApiReturn<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
  } | null;
}

export function useApi<T>({
  key,
  fetcher,
  isCustomResponse = false,
  customConfig = {},
}: UseApiOptions<T>): UseApiReturn<T> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      ...customConfig,
    },
  );

  return {
    data: isCustomResponse ? data : (data as { data: T })?.data,
    error,
    isLoading,
    isValidating,
    mutate,
    pagination: (data as { pagination: { page: number; limit: number; total: number } })?.pagination || null,
  };
}
