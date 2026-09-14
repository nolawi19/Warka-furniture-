import { redirect } from 'next/navigation';

/**
 * There is one catalogue, not a set of seasonal collections. Rather than
 * leave a nav link pointing at nothing, it goes where the pieces are.
 */
export default function Collections() {
  redirect('/shop');
}
