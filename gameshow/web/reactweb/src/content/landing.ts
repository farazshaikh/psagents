import { LandingPageContent, productCards } from './types';

export const landingPageContent: LandingPageContent = {
  companyHeader: {
    companyName: 'TrueMetry',
    tagLine: {
      word1: 'Entertainment',
      word2: 'Evolved'
    }
  },
  heroSection: {
    id: 'hero',
    title: 'Transform Your Content with AI',
    description: 'Create engaging, interactive content experiences powered by artificial intelligence. Turn your ideas into immersive stories.',
    ctaText: 'Get Started',
    ctaAction: '/get-started',
    fullHeight: true
  },
  productsSection: {
    id: 'products',
    title: 'Our Products',
    header: 'The Future of Media is Alive.',
    subHeader: 'Build AI agents. Spark legendary adventures. Beam stories into the multiverse.',
    categoryTerm: 'This is Storycasting.',
    closingLine: 'Welcome to the new era of imagination — where you don\'t just create content, you cast living worlds.',
    products: productCards
  },
  featuresSections: [
    {
      id: 'main-features',
      title: 'Why Choose Us',
      features: [
        {
          icon: '/static/images/ai-icon.svg',
          title: 'AI-Powered Creation',
          description: 'Leverage advanced AI to transform your content into interactive experiences.'
        },
        {
          icon: '/static/images/interactive-icon.svg',
          title: 'Interactive Engagement',
          description: 'Create immersive experiences that keep your audience engaged.'
        },
        {
          icon: '/static/images/analytics-icon.svg',
          title: 'Deep Analytics',
          description: 'Gain insights into how your audience interacts with your content.'
        }
      ]
    }
  ]
};