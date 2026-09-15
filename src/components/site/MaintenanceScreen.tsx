import styles from './MaintenanceScreen.module.css';

/**
 * What the public sees while the shop is closed.
 *
 * Staff never see this — the layout checks the session first — so a shop can be
 * closed for work and still be worked on. There is deliberately no sign-in link
 * here: a customer has no use for one, and it would only advertise the admin.
 */
export function MaintenanceScreen({
  name,
  nameAm,
  message,
  phone,
  phoneHref,
}: {
  name: string;
  nameAm: string;
  message: string;
  phone: string;
  phoneHref: string;
}) {
  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <p className={styles.brand}>{name.split(/\s+/)[0].toUpperCase()}</p>
        {nameAm && <p className={`am ${styles.brandAm}`}>{nameAm}</p>}
        <p className={styles.message}>{message}</p>
        {phone && (
          <p className={styles.contact}>
            <a href={`tel:${phoneHref}`}>{phone}</a>
          </p>
        )}
      </div>
    </div>
  );
}
