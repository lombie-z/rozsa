import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { GlobalSettings, Post, Page, PageBlocks } from './types';

const contentDir = path.join(process.cwd(), 'content');

function getAuthor(authorRef: string): { name: string; avatar?: string } | undefined {
  const filename = path.basename(authorRef);
  const filePath = path.join(contentDir, 'authors', filename);
  if (!fs.existsSync(filePath)) return undefined;
  const { data } = matter(fs.readFileSync(filePath, 'utf8'));
  return { name: data.name, avatar: data.avatar };
}

function getTagName(tagRef: string): string {
  return path.basename(tagRef, path.extname(tagRef));
}

function templateToTypename(template: string): string {
  const map: Record<string, string> = {
    callout: 'PageBlocksCallout',
    hero: 'PageBlocksHero',
    stats: 'PageBlocksStats',
    features: 'PageBlocksFeatures',
    testimonial: 'PageBlocksTestimonial',
    cta: 'PageBlocksCta',
    content: 'PageBlocksContent',
    video: 'PageBlocksVideo',
  };
  return map[template] || template;
}

function processBlock(rawBlock: Record<string, unknown>): PageBlocks {
  const { _template, ...rest } = rawBlock;
  return {
    __typename: templateToTypename(_template as string),
    ...rest,
  } as PageBlocks;
}

export function getGlobalSettings(): GlobalSettings {
  const filePath = path.join(contentDir, 'global', 'index.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as GlobalSettings;
}

function findMdxFiles(dir: string): string[] {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...findMdxFiles(fullPath));
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      result.push(fullPath);
    }
  }
  return result;
}

export function getAllPosts(): Post[] {
  const postsDir = path.join(contentDir, 'posts');
  const files = findMdxFiles(postsDir);

  const posts = files.map((filePath) => {
    const relativePath = path.relative(postsDir, filePath);
    const slug = relativePath.replace(/\.mdx?$/, '').split(path.sep).join('/');
    const breadcrumbs = slug.split('/');

    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);

    const author = data.author ? getAuthor(data.author as string) : undefined;
    const tags = Array.isArray(data.tags)
      ? data.tags.map((t: { tag: string }) => getTagName(t.tag))
      : [];

    return {
      id: slug,
      title: (data.title as string) || '',
      heroImg: data.heroImg as string | undefined,
      excerpt: data.excerpt as string | undefined,
      author,
      date: data.date ? new Date(data.date as string | Date).toISOString() : undefined,
      tags,
      body: content,
      _sys: { breadcrumbs },
    } as Post;
  });

  return posts.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function getPostBySlug(slug: string): Post | null {
  return getAllPosts().find((p) => p.id === slug) ?? null;
}

export function getPageBySlug(slug: string): Page | null {
  const filePath = path.join(contentDir, 'pages', `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data } = matter(raw);

  const blocks = Array.isArray(data.blocks) ? data.blocks.map(processBlock) : [];
  return { blocks };
}

export function getAllPageSlugs(): string[] {
  const pagesDir = path.join(contentDir, 'pages');
  if (!fs.existsSync(pagesDir)) return [];
  return fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''))
    .filter((slug) => slug !== 'home');
}
