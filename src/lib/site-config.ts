/**
 * Название приложения для шапки и title.
 */
export const APP_NAME = 'Distribution';

export const SITE_TITLE = `Bananay ${APP_NAME}`;

export const MAIN_SITE_URL = 'https://bananay.pro';
export const APP_PRODUCER_URL =
  process.env.APP_PRODUCER_URL?.trim() || `${MAIN_SITE_URL}#producer`;
export const APP_TRUCK_URL =
  process.env.APP_TRUCK_URL?.trim() || `${MAIN_SITE_URL}#drivers`;
export const APP_COURIER_URL =
  process.env.APP_COURIER_URL?.trim() || `${MAIN_SITE_URL}#courier`;
export const APP_TRACKING_URL =
  process.env.APP_TRACKING_URL?.trim() || `${MAIN_SITE_URL}#retail`;

export type RoleFooterLink = {
  translationKey: 'producer' | 'drivers' | 'courier' | 'retail';
  href: string;
};

export type RoleFooterConfig = {
  roleLabel: string;
  homeHref: string;
  contactEmail: string;
  contactPhoneHref: string;
  contactPhoneLabel: string;
  otherRoles: RoleFooterLink[];
};

export const ROLE_FOOTER_CONFIG: RoleFooterConfig = {
  roleLabel: APP_NAME,
  homeHref: MAIN_SITE_URL,
  contactEmail: 'hello@bananay.pro',
  contactPhoneHref: 'tel:+79183842676',
  contactPhoneLabel: '+7 918 384 2676',
  otherRoles: [
    { translationKey: 'producer', href: APP_PRODUCER_URL },
    { translationKey: 'drivers', href: APP_TRUCK_URL },
    { translationKey: 'courier', href: APP_COURIER_URL },
    { translationKey: 'retail', href: APP_TRACKING_URL },
  ],
};
