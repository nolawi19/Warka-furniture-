'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ADMIN_NAV, activeLink } from '@/lib/admin/nav';
import { AdminIcon } from './AdminIcon';
import styles from './AdminSidebar.module.css';

const STORAGE_KEY = 'warka.admin.collapsedGroups';

/**
 * The admin's left rail.
 *
 * Groups collapse, and which ones are collapsed is remembered per browser — a
 * shopkeeper who never touches Design should not have to scroll past it every
 * day. The group holding the current page is always open regardless, so a
 * collapsed group can never hide where you actually are.
 */
export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeLink(pathname);
  const currentGroup = ADMIN_NAV.find((g) => g.links.some((l) => l.href === current?.href));

  const [collapsed, setCollapsed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCollapsed(JSON.parse(raw) as string[]);
    } catch {
      // Blocked storage just means every group starts open.
    }
  }, []);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* nothing to do */
      }
      return next;
    });
  }

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      {ADMIN_NAV.map((group) => {
        const isCurrent = group.id === currentGroup?.id;
        const isOpen = isCurrent || !collapsed.includes(group.id);
        return (
          <section key={group.id} className={styles.group}>
            <button
              type="button"
              className={styles.groupHead}
              onClick={() => toggle(group.id)}
              aria-expanded={isOpen}
              aria-controls={`admin-group-${group.id}`}
            >
              <span>{group.label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" data-open={isOpen}>
                <path d="M7 10l5 5 5-5" />
              </svg>
            </button>

            <ul id={`admin-group-${group.id}`} className={styles.list} hidden={!isOpen}>
              {group.links.map((link) => {
                const active = current?.href === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={styles.link}
                      data-active={active}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                    >
                      <AdminIcon name={link.icon} className={styles.icon} />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
