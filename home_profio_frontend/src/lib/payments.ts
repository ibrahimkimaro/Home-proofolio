/**
 * Donations. For now the payment is SIMULATED: nothing is charged and nothing is sent anywhere, so the
 * whole flow (pick an amount, choose a method, pay, see the thank-you) can be built and tried.
 *
 * To go live with a local provider: set PAYMENTS_LIVE to true and replace the body of startDonation()
 * with a call to your backend (which talks to the provider: create the charge, send the mobile-money
 * prompt, confirm it) and resolve with the provider's real reference once it is confirmed paid.
 * Never put provider secrets in this file: it runs in the browser.
 */
export const PAYMENTS_LIVE = false;

export const CURRENCY = "TZS";

export type PayMethodKind = "mobile" | "card";

export interface PayMethod {
  id: string;
  label: string;
  kind: PayMethodKind;
  hint: string;
}

export const PAY_METHODS: PayMethod[] = [
  { id: "mpesa", label: "M-Pesa", kind: "mobile", hint: "Pay with your phone number" },
  { id: "tigo", label: "Tigo Pesa", kind: "mobile", hint: "Pay with your phone number" },
  { id: "airtel", label: "Airtel Money", kind: "mobile", hint: "Pay with your phone number" },
  { id: "halo", label: "HaloPesa", kind: "mobile", hint: "Pay with your phone number" },
  { id: "card", label: "Card", kind: "card", hint: "Visa or Mastercard, on a secure page" },
];

export interface DonationRequest {
  amount: number;
  method: string;
  /** Mobile-money number (mobile methods only). */
  phone?: string;
}

export interface DonationResult {
  reference: string;
}

export const formatMoney = (n: number) => new Intl.NumberFormat("en-TZ", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(n);

/** Placeholder for the real provider call (see the note at the top of this file). */
export async function startDonation(req: DonationRequest): Promise<DonationResult> {
  void req;
  await new Promise((r) => setTimeout(r, 1800));
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
  return { reference: `DEMO-${ref}` };
}
