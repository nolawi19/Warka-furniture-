import type { Metadata } from 'next';
import Image from 'next/image';

import { ActionButton } from '@/components/ui/ActionButton';
import styles from '../prose.module.css';

export const metadata: Metadata = {
  title: 'Visit Warka Furniture',
  description:
    'Visit Warka Wood Works — Industrial in Kebena, Addis Ababa to see our furniture, kitchen furniture, doors and custom woodwork, and talk to our team.',
  alternates: { canonical: '/visit' },
};

// The Google Maps URL API, given the workshop's name and area as the query.
// A search link rather than an invented place id: it finds the listing without
// this file claiming to know a place id nobody has given it. Swap in the real
// Business Profile link when there is one.
const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=WARKA+FURNITURE+INDUSTRIAL+Kebena+Addis+Ababa';

export default function VisitPage() {
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro micro--ember ${styles.kicker}`}>Warka Wood Works — Industrial</p>
        <h1 className={`dsp ${styles.title}`}>Visit Warka Furniture</h1>
        <p className={styles.lede}>
          Furniture is better experienced in person. Visit Warka Furniture to see our work, explore
          different designs and materials, and speak directly with our team about your furniture
          needs.
        </p>

        <Image
          src="/brand/shopfront.jpg"
          alt="The Warka Furniture workshop in Kebena, Addis Ababa, with a finished buttoned bed standing outside"
          width={432}
          height={511}
          sizes="(max-width: 700px) 100vw, 680px"
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line-2)',
          }}
        />

        <div className={styles.body}>
          <h2>Our Workshop</h2>
          <p>
            Warka Wood Works — Industrial creates furniture and woodwork designed for homes and
            spaces in Ethiopia.
          </p>
          <p>Our work includes:</p>
          <ul>
            <li>Furniture</li>
            <li>Kitchen furniture</li>
            <li>Doors</li>
            <li>Custom woodwork</li>
          </ul>
          <p>
            You can discuss your preferred design, size, materials, finish, and requirements
            directly with our team.
          </p>

          <h2>Find Us</h2>
          <p>Kebena, Addis Ababa, Ethiopia</p>
          <p>
            You can use our{' '}
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              Google Maps location
            </a>{' '}
            to find WARKA FURNITURE INDUSTRIAL and get directions to the workshop.
          </p>

          <h2>Contact Warka Furniture</h2>
          <p>
            For more information: <a href="tel:+251932214095">+251-932-214095</a>
          </p>
          <p>
            For direct orders: <a href="tel:+251949196561">+251-949-196561</a>
          </p>

          <h2>See Our Work in Person</h2>
          <p>
            Come and explore Warka Furniture and discuss your project with our team. Whether you are
            looking for furniture, a kitchen solution, doors, or custom woodwork, we can help you
            choose the right design for your space.
          </p>

          <div className={styles.cta}>
            <ActionButton as="link" href="/shop" variant="primary" size="lg" icon="arrow">
              Browse the Catalogue
            </ActionButton>
            <ActionButton as="link" href="/contact" variant="ghost" size="lg">
              Contact Warka Furniture
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
