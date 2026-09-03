"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCartStore, selectCart, selectTotalAmount } from "@/context/CartStore";
import { checkoutOrder } from "@/lib/api";
import type { CheckoutDto } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider, useToast } from "@/components/ui/toast";

const BUYER_ID = "00000000-0000-0000-0000-000000000001";
const MIN_ADDRESS_LENGTH = 5;
const MAX_ADDRESS_LENGTH = 500;

interface FieldErrors { address?: string; }

function CheckoutInner() {
  const router = useRouter();
  const { push: toast } = useToast();
  const cart = useCartStore(selectCart);
  const totalAmount = useCartStore(selectTotalAmount);
  const clearCart = useCartStore(s => s.clearCart);
  const removeFromCart = useCartStore(s => s.removeFromCart);
  const updateQuantity = useCartStore(s => s.updateQuantity);

  const [address, setAddress] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  if (cart.length === 0 && !submitted) {
    return (<div className="max-w-3xl mx-auto px-6 py-16"><EmptyState icon={<ShoppingCart size={48} />} title="Your cart is empty" description="Add some products before checking out." action={<Link href="/products" className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">Browse Catalog</Link>} /></div>);
  }

  const validate = (): FieldErrors => {
    const addr = address.trim();
    if (!addr || addr.length < MIN_ADDRESS_LENGTH) return { address: "Address must be at least " + MIN_ADDRESS_LENGTH + " characters." };
    if (addr.length > MAX_ADDRESS_LENGTH) return { address: "Address must be no more than " + MAX_ADDRESS_LENGTH + " characters." };
    return {};
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const dto: CheckoutDto = { buyerId: BUYER_ID, items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })), shippingAddress: address.trim() };
      const res = await checkoutOrder(dto);
      if (!res.success || !res.order) throw new Error(res.message);
      const createdOrderId = res.order.id;
      clearCart();
      setOrderId(createdOrderId);
      setSubmitted(true);
      toast("Order placed successfully!", "success");
      setTimeout(() => router.push("/orders/" + createdOrderId), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed.";
      const sc = err && typeof err === "object" && "statusCode" in err ? (err as {statusCode:number}).statusCode : 0;
      if (sc === 409) toast("One of your items just sold out. Please review your cart.", "warning");
      else toast(msg, "error");
      setSubmitError(msg);
    } finally { setIsSubmitting(false); }
  };

  if (submitted && orderId) return (<div className="max-w-2xl mx-auto px-6 py-16 text-center"><CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" /><h1 className="text-2xl font-bold text-zinc-900 mb-2">Order Placed!</h1><p className="text-zinc-600 mb-6">Redirecting to your order confirmation...</p><Link href={"/orders/" + orderId} className="px-5 py-2.5 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700">View Order</Link></div>);

  const taClass = fieldErrors.address ? "w-full border border-red-500 rounded p-2 text-sm" : "w-full border border-zinc-300 rounded p-2 text-sm";

  return (<div className="max-w-3xl mx-auto px-6 py-8 space-y-6"><h1 className="text-2xl font-bold text-zinc-900">Checkout</h1><div className="bg-white border border-zinc-200 rounded-lg overflow-hidden"><table className="w-full text-sm"><thead className="bg-zinc-50 border-b"><tr><th className="p-3 text-left font-semibold text-zinc-700">Item</th><th className="p-3 w-24 font-semibold text-zinc-700">Qty</th><th className="p-3 text-right w-28 font-semibold text-zinc-700">Total</th><th className="p-3 w-20" /></tr></thead><tbody className="divide-y">{cart.map(item => (<tr key={item.productId}><td className="p-3"><div className="font-medium text-zinc-900">{item.name}</div><div className="text-xs text-zinc-500">by {item.vendorName}</div><div className="text-xs text-zinc-400">{item.price.toFixed(2)} each</div></td><td className="p-3"><input type="number" min={1} max={item.maxStock} value={item.quantity} onChange={e => updateQuantity(item.productId, parseInt(e.target.value) || 1)} disabled={isSubmitting} className="w-20 border border-zinc-300 rounded px-2 py-1 text-sm disabled:opacity-50" aria-label={"Quantity for " + item.name} /></td><td className="p-3 text-right font-medium">{ (item.price * item.quantity).toFixed(2) }</td><td className="p-3"><button type="button" onClick={() => removeFromCart(item.productId)} disabled={isSubmitting} className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50">Remove</button></td></tr>))}</tbody><tfoot className="bg-zinc-50 border-t"><tr><td colSpan={2} className="p-3 text-right font-bold text-zinc-900 text-base">Order total</td><td className="p-3 text-right font-bold text-xl text-zinc-900">{ totalAmount.toFixed(2) }</td><td /></tr></tfoot></table></div><form onSubmit={handleSubmit} noValidate><fieldset disabled={isSubmitting} className="bg-white border border-zinc-200 rounded-lg p-4 space-y-3"><legend className="text-base font-semibold text-zinc-900 px-1">Shipping address</legend><div><label htmlFor="address" className="block text-sm font-medium text-zinc-700 mb-1">Full address <span className="text-red-500">*</span></label><textarea id="address" value={address} onChange={e => { setAddress(e.target.value); setFieldErrors({}); }} placeholder="123 Main St, Apt 4B, City, State, ZIP, Country" rows={3} minLength={MIN_ADDRESS_LENGTH} maxLength={MAX_ADDRESS_LENGTH} required className={taClass} aria-invalid={!!fieldErrors.address} aria-describedby={fieldErrors.address ? "address-error" : undefined} />{fieldErrors.address && <p id="address-error" role="alert" className="text-red-600 text-xs mt-1">{fieldErrors.address}</p>}<p className="text-xs text-zinc-400 mt-1">{address.length} / {MAX_ADDRESS_LENGTH} characters</p></div></fieldset>{submitError && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /><span>{submitError}</span></div>}<div className="flex gap-3 pt-2"><Link href="/products" className="px-4 py-2.5 border border-zinc-300 rounded text-center text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" aria-disabled={isSubmitting}>Continue shopping</Link><button type="submit" disabled={isSubmitting || cart.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white px-4 py-2.5 rounded font-medium text-sm">{isSubmitting ? "Placing order..." : "Place Order — $" + totalAmount.toFixed(2)}</button></div></form></div>);
}

export default function CheckoutPage() {
  return <ToastProvider><CheckoutInner /></ToastProvider>;
}