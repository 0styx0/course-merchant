import { NotFoundMessage } from "@/components/not-found-message";

export default function CheckoutNotFound() {
  return (
    <NotFoundMessage
      title="Checkout not found"
      detail="We couldn't find a checkout for this link. If you paid, look in your email for your access link."
    />
  );
}
