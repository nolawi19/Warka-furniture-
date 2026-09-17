/**
 * The site's own homepage, expressed as blocks.
 *
 * Opening the builder on a brand new homepage should show the shop the page it
 * already has — not an empty canvas, and not an approximation. Every block
 * below renders the same component `app/page.tsx` renders, with the same
 * content, so "Build the homepage" followed immediately by "Publish" changes
 * nothing that a visitor can see. That is the test this file has to pass.
 */
import { newBlockWithStarter, type Block } from './blocks';

/** Padding in the shell, where the component does not bring its own. */
function pad(block: Block, top: number, bottom: number): Block {
  return { ...block, style: { ...block.style, paddingTop: top, paddingBottom: bottom } };
}

export function homepageBlocks(): Block[] {
  return [
    // The hero and the quote carry their own vertical rhythm, so the shell
    // adds none — otherwise the page grows a second helping of space.
    pad(newBlockWithStarter('hero'), 0, 0),
    pad(newBlockWithStarter('categoryGrid'), 64, 64),
    pad(newBlockWithStarter('productGrid'), 64, 64),
    pad(newBlockWithStarter('steps'), 64, 64),
    pad(newBlockWithStarter('quote'), 64, 64),
    pad(newBlockWithStarter('storeInfo'), 64, 64),
  ];
}
