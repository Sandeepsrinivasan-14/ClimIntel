import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Load Genkit from node_modules at runtime instead of bundling it (avoids optional-dependency warnings).
  serverExternalPackages: ['genkit', '@genkit-ai/google-genai', '@genkit-ai/core'],
  images: {
    remotePatterns: [
      // Weather condition icons from WeatherAPI.com (only used when WEATHER_API_KEY is set)
      { protocol: 'https', hostname: 'cdn.weatherapi.com', pathname: '/**' },
    ],
  },
  webpack: (config) => {
    // Genkit's prompt templates use Handlebars; point webpack at its browser-safe build.
    config.resolve.alias = { ...config.resolve.alias, handlebars: 'handlebars/dist/handlebars.js' };
    return config;
  },
};

export default nextConfig;
