export interface AppConfig {
  companyName: string;
  api: {
    baseUrl: string;
    endpoints: {
      config: string;
    }
  };
  theme: {
    current: 'default' | 'instagram' | 'tiktok';
  };
  products: {
    id: string;
    name: string;
    description: string;
    route: string;
  }[];
}

// Default configuration
export const defaultConfig: AppConfig = {
  companyName: 'CompanyName',
  api: {
    baseUrl: 'https://domainname',
    endpoints: {
      config: '/restendpoint'
    }
  },
  theme: {
    current: 'default'
  },
  products: [
    {
      id: 'trueshow',
      name: 'TrueShow',
      description: 'AI-hosted interactive game show experience',
      route: '/trueshow'
    }
  ]
};

// Function to fetch remote configuration
export async function fetchConfig(): Promise<AppConfig> {
  try {
    const response = await fetch(`${defaultConfig.api.baseUrl}${defaultConfig.api.endpoints.config}`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch remote config, using default', error);
    return defaultConfig;
  }
}