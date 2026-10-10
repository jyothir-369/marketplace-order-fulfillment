import { Home, ShoppingBag, Tag, Users, Heart, HelpCircle, User, ShoppingCart } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  role?: string[];
  dropdownItems?: { label: string; href: string }[];
  mobileInBottomNav?: boolean;
}

export const STOREFRONT_NAV: NavItem[] = [
  { label: "Home", href: "/", Icon: Home, mobileInBottomNav: true },
  {
    label: "Shop",
    href: "/products",
    Icon: ShoppingBag,
    mobileInBottomNav: true,
    dropdownItems: [
      { label: "All Products", href: "/products" },
      { label: "New Arrivals", href: "/products?sort=newest" },
      { label: "Best Sellers", href: "/products?sort=bestselling" },
    ],
  },
  {
    label: "Categories",
    href: "/categories",
    Icon: Tag,
    mobileInBottomNav: false,
    dropdownItems: [
      { label: "Electronics", href: "/products?category=electronics" },
      { label: "Fashion", href: "/products?category=fashion" },
      { label: "Home & Living", href: "/products?category=home" },
      { label: "Deals", href: "/deals" },
    ],
  },
  { label: "Deals", href: "/deals", Icon: Tag, mobileInBottomNav: false },
  { label: "Vendors", href: "/vendors", Icon: Users, mobileInBottomNav: true },
  { label: "Wishlist", href: "/wishlist", Icon: Heart, mobileInBottomNav: false },
  { label: "Orders", href: "/orders", Icon: User, mobileInBottomNav: true },
  { label: "Help", href: "/help", Icon: HelpCircle, mobileInBottomNav: false },
];

export const OPERATIONAL_NAV = [
  { label: "Dashboard", href: "/dashboard", Icon: Home },
  { label: "Orders", href: "/orders", Icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", Icon: Tag },
  { label: "Analytics", href: "/analytics", Icon: Users },
];
