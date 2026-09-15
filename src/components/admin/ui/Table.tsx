import styles from './Table.module.css';

export function Table({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const cell = styles;
