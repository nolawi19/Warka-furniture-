/**
 * The site's own homepage, expressed as blocks.
 *
 * Opening the builder on a brand new homepage should show the shop the page it
 * already has — not an empty canvas, and not an approximation. Every block
 * below renders the same component `app/page.tsx` renders, with the same
 * content, so "Build the homepage" followed immediately by "Publish" changes
 * nothing that a visitor can see. That is the test this file has to pass.
 */
import { BLOCK_PROPS, newBlockWithStarter, type Block } from './blocks';

/** Vertical rhythm in the shell, where the component does not bring its own. */
function pad(block: Block, spacing: Block['style']['spacing']): Block {
  return { ...block, style: { ...block.style, spacing } };
}

/** Fill one prop in, keeping the block valid. */
function withProps(block: Block, props: Record<string, unknown>): Block {
  const merged = BLOCK_PROPS[block.type].safeParse({ ...block.props, ...props });
  return merged.success ? { ...block, props: merged.data } : block;
}

/**
 * @param area the shop's own location, which the steps panel prints beside its
 *   heading. Passed in rather than read here, because this file is imported by
 *   the builder in the browser and Store settings are a server read.
 */
export function homepageBlocks(area?: string): Block[] {
  return [
    // The hero and the quote carry their own vertical rhythm, so the shell
    // adds none — otherwise the page grows a second helping of space. The rest
    // take the site's own section spacing, which is why a published copy of
    // this page measures the same as the page it replaces.
    pad(newBlockWithStarter('hero'), 'none'),
    pad(newBlockWithStarter('categoryGrid'), 'normal'),
    pad(newBlockWithStarter('productGrid'), 'normal'),
    pad(area ? withProps(newBlockWithStarter('steps'), { note: area }) : newBlockWithStarter('steps'), 'normal'),
    pad(newBlockWithStarter('quote'), 'none'),
    pad(newBlockWithStarter('storeInfo'), 'normal'),
  ];
}
