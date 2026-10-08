import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://contactreachout.com';
  const lastModified = new Date();

  const publicRoutes = [
    '',
    '/features',
    '/how-it-works',
    '/pricing',
    '/contact-form-outreach',
    '/website-contact-form-automation',
    '/ai-outreach',
    '/b2b-lead-generation',
    '/ai-personalization',
    '/benefits',
    '/about',
    '/contact',
    '/help',
    '/privacy',
    '/terms',
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/pricing' || route === '/contact-form-outreach' ? 0.8 : 0.7,
  }));
}
