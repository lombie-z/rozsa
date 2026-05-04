import React from 'react';
import { notFound } from 'next/navigation';
import { getPageBySlug, getAllPageSlugs } from '@/lib/content';
import Layout from '@/components/layout/layout';
import { Section } from '@/components/layout/section';
import ClientPage from './client-page';

export const revalidate = false;

export default async function Page({
  params,
}: {
  params: Promise<{ urlSegments: string[] }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.urlSegments.join('/');

  const page = getPageBySlug(slug);
  if (!page) {
    notFound();
  }

  return (
    <Layout>
      <Section>
        <ClientPage page={page} />
      </Section>
    </Layout>
  );
}

export async function generateStaticParams() {
  const slugs = getAllPageSlugs();
  return slugs.map((slug) => ({
    urlSegments: slug.split('/'),
  }));
}
