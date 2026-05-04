import { format } from 'date-fns';
import React from 'react';
import Image from 'next/image';
import { Video } from './blocks/video';
import type { PageBlocksVideo } from '@/lib/types';

// Custom components available for use in post rendering
export const components = {
  DateTime: (props: { format?: string }) => {
    const dt = React.useMemo(() => new Date(), []);
    switch (props.format) {
      case 'iso':
        return <span>{format(dt, 'yyyy-MM-dd')}</span>;
      case 'utc':
        return <span>{format(dt, 'eee, dd MMM yyyy HH:mm:ss OOOO')}</span>;
      case 'local':
        return <span>{format(dt, 'P')}</span>;
      default:
        return <span>{format(dt, 'P')}</span>;
    }
  },
  img: (props: { url: string; alt?: string }) => {
    if (!props) return <></>;
    return (
      <span className='flex items-center justify-center'>
        <Image src={props.url} alt={props.alt || ''} width={500} height={500} />
      </span>
    );
  },
  video: (props: PageBlocksVideo) => {
    return <Video data={props} />;
  },
};
