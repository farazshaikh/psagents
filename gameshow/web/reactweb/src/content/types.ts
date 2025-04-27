import { ReactNode } from 'react';

// Company Header Types
export interface CompanyHeaderContent {
  companyName: string;
  tagLine: {
    word1: string;
    word2: string;
  };
}

// Section Types
export interface SectionContent {
  id: string;
  title: string;
  description?: string | ReactNode;
  fullHeight?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

// Feature Types
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesSectionContent extends SectionContent {
  features: Feature[];
}

// Hero Section Types
export interface HeroSectionContent extends SectionContent {
  ctaText: string;
  ctaAction?: string; // URL or action identifier
}

// Product Card Types
export interface ProductCardContent {
  name: string;
  unicodeLogo: string;
  description: string;
  ctaText: string;
  ctaHref: string;
}

// Product Cards Content
export const productCards: ProductCardContent[] = [
  {
    name: "Crew",
    unicodeLogo: "👽",
    description: "Train your legendary crew.",
    ctaText: "Start Training",
    ctaHref: "/crew"
  },
  {
    name: "Plot",
    unicodeLogo: "📜",
    description: "Prompt their legendary adventures.",
    ctaText: "Write Story",
    ctaHref: "/plot"
  },
  {
    name: "Beam",
    unicodeLogo: "🛸",
    description: "Beam them across the multiverse.",
    ctaText: "Start Beaming",
    ctaHref: "/beam"
  },
  {
    name: "Play",
    unicodeLogo: "🎮",
    description: "Experience the future of game shows.",
    ctaText: "Play Now",
    ctaHref: "/gameshow"
  }
];

// Products Section Types
export interface ProductsSectionContent extends SectionContent {
  header: string;
  subHeader: string;
  categoryTerm: string;
  closingLine: string;
  products: ProductCardContent[];
}

// Landing Page Content Type
export interface LandingPageContent {
  companyHeader: CompanyHeaderContent;
  heroSection: HeroSectionContent;
  productsSection: ProductsSectionContent;
  featuresSections: FeaturesSectionContent[];
}