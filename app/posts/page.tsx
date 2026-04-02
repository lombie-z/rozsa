import Layout from '@/components/layout/layout';
import { getAllPosts } from '@/lib/content';
import PostsClientPage from './client-page';

export const revalidate = false;

export default async function PostsPage() {
  const posts = getAllPosts();

  return (
    <Layout>
      <PostsClientPage posts={posts} />
    </Layout>
  );
}
