import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'ru'],
  defaultLocale: 'ru',
  pathnames: {
    '/': '/',
    '/login': '/login',
    '/privacy-policy': '/privacy-policy',
    '/user-agreement': '/user-agreement',
    '/dashboard': '/dashboard',
    '/dashboard/receiving': '/dashboard/receiving',
    '/dashboard/current': '/dashboard/current',
    '/dashboard/history': '/dashboard/history',
    '/dashboard/profile': '/dashboard/profile',
    '/dc/login': '/dc/login',
    '/dc/dashboard': '/dc/dashboard',
    '/dc/dashboard/receiving': '/dc/dashboard/receiving',
    '/dc/dashboard/current': '/dc/dashboard/current',
    '/dc/dashboard/history': '/dc/dashboard/history',
    '/dc/dashboard/profile': '/dc/dashboard/profile',
    '/dashboard/daily-checkin': '/dashboard/daily-checkin',
    '/dashboard/vehicles': '/dashboard/vehicles',
    '/dashboard/documents': '/dashboard/documents',
    '/dashboard/delivery-tasks': '/dashboard/delivery-tasks',
    '/dashboard/delivery-tasks/history': '/dashboard/delivery-tasks/history',
    '/onboarding': '/onboarding',
  },
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
