import type { Metadata } from 'next';

import { StoreMap } from '@/components/sections/StoreMap';
import { ActionButton } from '@/components/ui/ActionButton';
import { getShop } from '@/lib/site/shop';
import styles from '../prose.module.css';

export const metadata: Metadata = {
  title: 'Visit Warka Furniture',
  description:
    'Visit Warka Wood Works — Industrial in Addis Ababa to see our furniture, kitchen furniture, doors and custom woodwork, and talk to our team.',
  alternates: { canonical: '/visit' },
};

export default async function VisitPage() {
  // The map pin, the directions link, the address and the numbers all come
  // from Store Settings, so this page cannot drift from the footer or the
  // contact page.
  const shop = await getShop();
  return (
    <div className="wrap">
      <div className={styles.page}>
        <p className={`micro micro--ember ${styles.kicker}`}>{shop.workshopName}</p>
        <h1 className={`dsp ${styles.title}`}>Visit Warka Furniture</h1>
        <p className={styles.lede}>
          Furniture is better experienced in person. Visit Warka Furniture to see our work, explore
          different designs and materials, and speak directly with our team about your furniture
          needs.
        </p>

        <StoreMap
          lat={shop.latitude}
          lng={shop.longitude}
          label="WARKA FURNITURE"
          note={shop.area}
          zoom={17}
          height={420}
        />

        <div className={styles.cta}>
          <ActionButton
            as="link"
            href={shop.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
          >
            Get Directions
          </ActionButton>
        </div>

        <div className={styles.body}>
          <h2>Our Workshop</h2>
          <p>
            {shop.workshopName} creates furniture and woodwork designed for homes and spaces in
            Ethiopia.
          </p>
          <p>Our work includes:</p>
          <ul>
            {shop.services.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>
            You can discuss your preferred design, size, materials, finish, and requirements
            directly with our team.
          </p>

          <h2>Find Us</h2>
          <p>{shop.area}</p>
          <p>
            You can use our{' '}
            <a href={shop.mapsUrl} target="_blank" rel="noopener noreferrer">
              Google Maps location
            </a>{' '}
            to find WARKA FURNITURE INDUSTRIAL and get directions to the workshop.
          </p>

          <h2>Contact Warka Furniture</h2>
          <p>
            For more information: <a href={`tel:${shop.phoneHref}`}>{shop.phone}</a>
          </p>
          <p>
            For direct orders: <a href={`tel:${shop.orderPhoneHref}`}>{shop.orderPhone}</a>
          </p>
          <p>
            Email: <a href={`mailto:${shop.email}`}>{shop.email}</a>
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
