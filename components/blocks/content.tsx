'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PageBlocksContent } from '@/lib/types';
import { Section } from '../layout/section';
import { Mermaid } from './mermaid';

export const Content = ({ data }: { data: PageBlocksContent }) => {
  return (
    <Section background={data.background!} className='prose prose-lg'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const lang = /language-(\w+)/.exec(className || '')?.[1];
            if (lang === 'mermaid') {
              return <Mermaid value={String(children).replace(/\n$/, '')} />;
            }
            return <code className={className}>{children}</code>;
          },
        }}
      >
        {data.body || ''}
      </ReactMarkdown>
    </Section>
  );
};
