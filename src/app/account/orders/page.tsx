import { redirect } from 'next/navigation';

// Orders live on the account page; this keeps the footer link working.
export default function AccountOrders() {
  redirect('/account');
}
