import type { Metadata } from 'next';

import { ActionButton } from '@/components/ui/ActionButton';
import styles from '../prose.module.css';

export const metadata: Metadata = {
  title: 'Built Around Your Space',
  description:
    'Warka Furniture builds to your measurements in Addis Ababa, in the board and the finish you pick.',
  alternates: { canonical: '/craft' },
};

export default function CraftPage() {
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro micro--ember ${styles.kicker}`}>Made in Addis Ababa</p>
        <h1 className={`dsp ${styles.title}`}>Built Around Your Space</h1>
        <p className={styles.lede}>
          At Warka Furniture, we believe great furniture should fit your home — not the other way
          around.
        </p>

        <div className={styles.body}>
          <p>
            Inspired by the Warka tree, a symbol of gathering, shelter, and longevity, we create
            furniture designed to become part of your everyday life. Every piece is made with care,
            attention to detail, and a focus on lasting comfort.
          </p>

          <h2>Made for Your Measurements</h2>
          <p>Every room is different, and every home has its own character.</p>
          <p>
            That is why we make furniture to your measurements. Whether you need a bed, table,
            wardrobe, chest of drawers, or another piece, the dimensions shown in our shop are
            popular sizes — not limits.
          </p>
          <p>
            Bring us your measurements, and we will help create a piece that belongs naturally in
            your space.
          </p>

          <h2>Quality Materials, Carefully Chosen</h2>
          <p>
            We use 18 mm boards for cases, tops, and drawer fronts, available in clean white
            melamine or a sophisticated grey marble-effect finish.
          </p>
          <p>
            Both options are easy to maintain, durable for everyday use, and finished to give your
            furniture a clean, modern appearance.
          </p>
          <p>
            You choose the finish when you order, so your furniture arrives looking the way you
            imagined it.
          </p>

          <h2>Crafted by Hand</h2>
          <p>
            Our upholstered headboards, bed rails, and stool tops are padded and buttoned in our
            workshop.
          </p>
          <p>
            The diamond buttoning pattern is carefully laid out by hand, allowing the proportions to
            suit each individual piece rather than forcing every design into the same standard
            pattern.
          </p>
          <p>It is a small detail — but it is the kind of detail that makes a piece feel special.</p>

          <h2>Made to Order</h2>
          <p>Most made-to-order furniture takes around two weeks to complete.</p>
          <p>
            If we already have a finished piece in the size you need, you can take it home the same
            day. Look for pieces marked <em>Ready to Take Away</em> in our shop.
          </p>

          <h2>Honest Advice Comes First</h2>
          <p>We want you to be happy with your furniture long after it leaves our workshop.</p>
          <p>So we will tell you honestly:</p>
          <ul>
            <li>If a size will not work well in your room, we will tell you before we build it.</li>
            <li>
              If a particular finish is not suitable for where you plan to use it, we will recommend
              another option.
            </li>
            <li>
              If there is a simpler, faster, or more affordable way to achieve what you want, we
              will show you.
            </li>
            <li>
              If we believe something will not give you the result you expect, we will say so.
            </li>
          </ul>

          <h2>Come See the Craft</h2>
          <p>
            Furniture is better when you can see it, touch it, and experience the quality for
            yourself.
          </p>
          <p>
            Visit Warka Furniture in Addis Ababa and discover what we can create for your space.
          </p>

          <div className={styles.cta}>
            <ActionButton as="link" href="/visit" variant="primary" size="lg" icon="arrow">
              Come and See a Piece
            </ActionButton>
            <ActionButton as="link" href="/shop" variant="ghost" size="lg">
              Explore the Catalogue
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
