# Media Assets Organization

## Directory Structure

```
reactweb/
├── public/
│   └── static/          # Static assets served directly
│       ├── images/      # Large images, photos
│       ├── fonts/       # Font files
│       └── logos/       # Brand logos
└── src/
    └── assets/          # Build-time assets
        ├── images/      # Small images, icons
        ├── fonts/       # Font declarations
        └── logos/       # Brand assets
```

## Asset Organization Guidelines

### 1. Build-time Assets (src/assets/)
- Small, frequently used images (< 10KB)
- SVG icons and logos
- Font declarations and configurations
- Assets that need processing during build
- Assets referenced in component styles

### 2. Runtime Static Assets (public/static/)
- Large images and media files
- Font files
- High-resolution logos
- Assets that don't need build processing
- Assets loaded dynamically

### 3. Dynamic Content
Served through:
- Backend API server
- Cloudflare Workers
- Content Delivery Network (CDN)

## Usage Guidelines

### 1. Importing Build-time Assets
```typescript
// For images/SVGs in components
import logo from 'assets/logos/logo.svg';
import icon from 'assets/images/icon.png';

// For CSS
import 'assets/fonts/font-declarations.css';
```

### 2. Using Public Static Assets
```typescript
// In components
const imageUrl = `${process.env.PUBLIC_URL}/static/images/large-image.jpg`;
const fontUrl = `${process.env.PUBLIC_URL}/static/fonts/custom-font.woff2`;

// In CSS
url('/static/images/background.jpg')
```

### 3. Dynamic Content
```typescript
// Using environment variables for API endpoints
const dynamicImageUrl = `${process.env.REACT_APP_CDN_URL}/images/dynamic-content.jpg`;
const apiEndpoint = `${process.env.REACT_APP_API_URL}/media`;
```

## Asset Types and Formats

### Images
- Icons: SVG, PNG (if needed)
- Logos: SVG preferred, PNG as fallback
- Photos: WebP with JPEG fallback
- Background Images: WebP/JPEG, optimized for web

### Fonts
- Modern Formats: WOFF2, WOFF
- Legacy Support: TTF
- Include font subsetting for optimization

### Performance Guidelines
1. Use WebP with JPEG fallback for photos
2. SVG for all icons and logos where possible
3. Implement lazy loading for images
4. Use appropriate image sizes for different viewports
5. Implement preloading for critical assets

## Environment Configuration
```env
# .env
REACT_APP_CDN_URL=https://cdn.truem.com
REACT_APP_API_URL=https://api.truem.com
```

## Deployment Considerations

### CDN Setup
1. Configure Cloudflare Workers for dynamic content
2. Set up caching rules:
   - Long cache for static assets
   - Short cache for dynamic content
   - No cache for real-time data

### Performance Optimization
1. Enable Brotli/Gzip compression
2. Set appropriate cache headers
3. Use CDN edge locations
4. Implement image optimization pipeline

### Security
1. Implement content security policy
2. Set up CORS headers
3. Use signed URLs for sensitive content
4. Regular security audits