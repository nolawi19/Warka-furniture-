/**
 * Turning an unknown value into something safe to put in an input or a label.
 *
 * `String(x)` on an object gives "[object Object]", which is how a form ends
 * up showing that instead of a value, and how an object quietly becomes a
 * React key. Block props and form data are both `unknown` by the time they
 * reach a component, so the coercion has to be deliberate.
 *
 * Anything that is not a string, number or boolean returns the fallback,
 * because there is no sensible text for it.
 */
export function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return fallback;
}
