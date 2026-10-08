import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/campaigns/',
          '/inbox/',
          '/profile/',
          '/settings/',
          '/crm/',
          '/leads/',
          '/checkout/',
          '/credits/',
          '/import/',
          '/logs/',
          '/processing/',
          '/referral/',
          '/results/',
          '/templates/',
          '/unibox/',
          '/login',
          '/signup',
        ],
      },
    ],
    sitemap: 'https://contactreachout.com/sitemap.xml',
  };
}
