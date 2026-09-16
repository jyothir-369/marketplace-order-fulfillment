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