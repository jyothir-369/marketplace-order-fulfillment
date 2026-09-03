/** Minimal type stub for lucide-react — installed at runtime via npm */
declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";
  export type LucideIconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number | string }>;
  export interface LucideIconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
  }
  export const AlertTriangle: LucideIconType;
  export const ArrowLeft: LucideIconType;
  export const CheckCircle: LucideIconType;
  export const CheckCircle2: LucideIconType;
  export const Clock: LucideIconType;
  export const Hourglass: LucideIconType;
  export const Inbox: LucideIconType;
  export const Info: LucideIconType;
  export const Loader2: LucideIconType;
  export const Package: LucideIconType;
  export const PackageCheck: LucideIconType;
  export const RefreshCw: LucideIconType;
  export const ShoppingBag: LucideIconType;
  export const ShoppingCart: LucideIconType;
  export const Store: LucideIconType;
  export const Truck: LucideIconType;
  export const X: LucideIconType;
  export const XCircle: LucideIconType;
  export const Plus: LucideIconType;
  export const Pause: LucideIconType;
  export const Play: LucideIconType;
  export const LayoutGrid: LucideIconType;
  export const BarChart3: LucideIconType;
  export const ClipboardList: LucideIconType;
  export const DatabaseZap: LucideIconType;
  export const ArrowRight: LucideIconType;
  export const Copy: LucideIconType;
  export const CopyCheck: LucideIconType;
  export const ChevronDown: LucideIconType;
  export const ChevronUp: LucideIconType;
  export const RotateCcw: LucideIconType;
  export const Search: LucideIconType;
  export type LucideIcon = LucideIconType;
  export default function createIcon(path: string, viewBox?: string): LucideIconType;
}