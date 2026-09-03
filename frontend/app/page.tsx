/**
 * Root page -> redirect to /products (GAP-F11).
 * The actual storefront lives under the (storefront) route group.
 */
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/products");
}