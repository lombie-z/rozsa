export interface IconData {
  name: string;
  color?: string;
  style?: string;
  size?: string;
}

export interface GlobalSettings {
  header: {
    icon: IconData;
    name: string;
    color: string;
    nav: Array<{ href: string; label: string }>;
  };
  footer: {
    social: Array<{
      icon: IconData;
      url: string;
    }>;
  };
  theme: {
    color: string;
    font?: string;
    darkMode?: string;
  };
}

export interface PageBlocksCallout {
  __typename: 'PageBlocksCallout';
  background?: string;
  text?: string;
  url?: string;
}

export interface PageBlocksHeroImage {
  src?: string;
  alt?: string;
  videoUrl?: string;
}

export interface PageBlocksHeroAction {
  label?: string;
  type?: string;
  icon?: IconData;
  link?: string;
}

export interface PageBlocksHero {
  __typename: 'PageBlocksHero';
  background?: string;
  headline?: string;
  tagline?: string;
  actions?: PageBlocksHeroAction[];
  image?: PageBlocksHeroImage;
}

export interface PageBlocksStatsStat {
  stat?: string;
  type?: string;
}

export interface PageBlocksStats {
  __typename: 'PageBlocksStats';
  background?: string;
  title?: string;
  description?: string;
  stats?: PageBlocksStatsStat[];
}

export interface PageBlocksFeaturesItem {
  icon?: IconData;
  title?: string;
  text?: string;
}

export interface PageBlocksFeatures {
  __typename: 'PageBlocksFeatures';
  background?: string;
  title?: string;
  description?: string;
  items?: PageBlocksFeaturesItem[];
}

export interface PageBlocksTestimonialItem {
  quote?: string;
  author?: string;
  role?: string;
  avatar?: string;
}

export interface PageBlocksTestimonial {
  __typename: 'PageBlocksTestimonial';
  background?: string;
  title?: string;
  description?: string;
  testimonials?: PageBlocksTestimonialItem[];
}

export interface PageBlocksCtaAction {
  label?: string;
  type?: string;
  icon?: IconData;
  link?: string;
}

export interface PageBlocksCta {
  __typename: 'PageBlocksCta';
  background?: string;
  title?: string;
  description?: string;
  actions?: PageBlocksCtaAction[];
}

export interface PageBlocksContent {
  __typename: 'PageBlocksContent';
  background?: string;
  body?: string;
}

export interface PageBlocksVideo {
  __typename: 'PageBlocksVideo';
  background?: string;
  color?: string;
  url?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export type PageBlocks =
  | PageBlocksCallout
  | PageBlocksHero
  | PageBlocksStats
  | PageBlocksFeatures
  | PageBlocksTestimonial
  | PageBlocksCta
  | PageBlocksContent
  | PageBlocksVideo;

export interface Page {
  blocks?: PageBlocks[];
}

export interface PostAuthor {
  name: string;
  avatar?: string;
}

export interface Post {
  id: string;
  title: string;
  heroImg?: string;
  excerpt?: string;
  author?: PostAuthor;
  date?: string;
  tags?: string[];
  body: string;
  _sys: {
    breadcrumbs: string[];
  };
}
