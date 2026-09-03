declare module "clsx" {
  export type ClassValue =
    | string
    | number
    | boolean
    | undefined
    | null
    | ClassValue[]
    | { [k: string]: unknown };
  export function clsx(...inputs: ClassValue[]): string;
  export default clsx;
}

declare module "tailwind-merge" {
  export function twMerge(input: string): string;
  export default twMerge;
}

declare module "@tanstack/react-query" {
  export interface QueryClient {
    getQueryData<T = unknown>(key: unknown): T | undefined;
    setQueryData<T = unknown>(key: unknown, data: T | undefined): T | undefined;
    invalidateQueries(key?: unknown): Promise<void>;
    clear(): void;
    mount(): void;
    unmount(): void;
    setDefaultOptions(options: unknown): void;
  }
  export interface QueryObserverResult<TData, TError> {
    data: TData | undefined;
    error: TError | null;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    isFetching: boolean;
    dataUpdatedAt: number;
    status: "pending" | "error" | "success";
    refetch(): Promise<QueryObserverResult<TData, TError>>;
  }
  export interface UseQueryOptions<TData, TError, TQueryFnData> {
    queryKey: unknown;
    queryFn: () => Promise<TQueryFnData>;
    enabled?: boolean;
    refetchInterval?: number | false | ((q: { state: { data: unknown } }) => number | false);
    refetchIntervalInBackground?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean | "ifStale" | "always";
    staleTime?: number;
    gcTime?: number;
  }
  export function useQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
    options: UseQueryOptions<TData, TError, TQueryFnData>
  ): QueryObserverResult<TData, TError>;
}