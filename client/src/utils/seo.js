import { useEffect } from 'react';

const JSONLD_ID = 'jobhexa-seo-jsonld';

export const getSiteUrl = () => {
  const configured = import.meta.env.VITE_SITE_URL;
  const fallback = typeof window !== 'undefined' ? window.location.origin : '';
  return String(configured || fallback).replace(/\/+$/, '');
};

const upsertMeta = (key, value, attr = 'name') => {
  if (value === undefined || value === null) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', String(value));
};

const upsertLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

export function useSeo({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex = false,
  jsonLd = null,
}) {
  const json = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const site = getSiteUrl();
    const fullTitle = title ? `${title} | JobHexa` : 'JobHexa - All India Government Job Portal';
    const url = `${site}${path || (typeof window !== 'undefined' ? window.location.pathname : '/')}`;

    document.title = fullTitle;
    upsertMeta('description', description);
    upsertMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('og:title', fullTitle, 'property');
    upsertMeta('og:description', description, 'property');
    upsertMeta('og:type', type, 'property');
    upsertMeta('og:url', url, 'property');
    upsertMeta('og:site_name', 'JobHexa', 'property');
    upsertMeta('twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('twitter:title', fullTitle);
    upsertMeta('twitter:description', description);
    if (image) {
      const imageUrl = image.startsWith('http') ? image : `${site}${image}`;
      upsertMeta('og:image', imageUrl, 'property');
      upsertMeta('twitter:image', imageUrl);
    }
    upsertLink('canonical', url);

    const previous = document.getElementById(JSONLD_ID);
    if (previous) previous.remove();
    if (json) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = JSONLD_ID;
      script.textContent = json;
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById(JSONLD_ID);
      if (script) script.remove();
    };
  }, [title, description, path, image, type, noindex, json]);
}

const stripHtml = (value) => String(value || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const moneyValues = (text) => {
  const cleaned = String(text || '').replace(/(\d)[,\s](?=\d)/g, '$1');
  const matches = cleaned.match(/\d{3,}/g) || [];
  return matches.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 2);
};

const salaryJsonLd = (job) => {
  const values = moneyValues(job.salary || job.payScale);
  if (!values.length) return undefined;
  const unitText = 'MONTH';
  const value = values.length > 1
    ? { '@type': 'QuantitativeValue', minValue: Math.min(...values), maxValue: Math.max(...values), unitText }
    : { '@type': 'QuantitativeValue', value: values[0], unitText };
  return { '@type': 'MonetaryAmount', currency: 'INR', value };
};

export function buildJobPostingJsonLd(job) {
  if (!job) return null;
  const site = getSiteUrl();
  const organization = job.organization || job.department || 'JobHexa';
  const description = stripHtml(
    job.description || job.shortDescription || `${job.title} at ${organization}. Check eligibility, important dates and how to apply.`
  ).slice(0, 5000);
  const datePosted = job.publicationDate || job.createdAt || new Date().toISOString();
  const locationState = job.state && job.state !== 'All India' ? job.state : null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description,
    identifier: {
      '@type': 'PropertyValue',
      name: organization,
      value: String(job._id || job.slug),
    },
    datePosted: new Date(datePosted).toISOString(),
    employmentType: 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: organization,
      ...(job.officialWebsite ? { sameAs: job.officialWebsite } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        ...(locationState ? { addressRegion: locationState } : {}),
      },
    },
    url: `${site}/jobs/${encodeURIComponent(job.slug)}`,
    directApply: Boolean(job.applyLink || job.officialApplyUrl),
  };

  if (job.applicationEndDate) {
    data.validThrough = new Date(job.applicationEndDate).toISOString();
  }
  if (job.totalVacancies) data.totalJobOpenings = job.totalVacancies;
  const salary = salaryJsonLd(job);
  if (salary) data.baseSalary = salary;
  return data;
}

export function buildWebsiteJsonLd() {
  const site = getSiteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'JobHexa',
    url: `${site}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${site}/jobs?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
