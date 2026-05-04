import React from 'react';
import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/content';
import Layout from '@/components/layout/layout';
import PostClientPage from './client-page';

export const revalidate = false;

export default async function PostPage({
  params,
}: {
  params: Promise<{ urlSegments: string[] }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.urlSegments.join('/');
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <Layout>
      <PostClientPage post={post} />
    </Layout>
  );
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    urlSegments: post._sys.breadcrumbs,
  }));
}
