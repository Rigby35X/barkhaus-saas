# Logo Update Guide for Happy Paws Site

## Quick Logo Replacement

### Step 1: Prepare Your Logo Files
Create two versions of your logo:
1. **Dark version** - for light backgrounds (header)
2. **Light/white version** - for dark backgrounds (footer)

### Step 2: File Specifications
- **Format**: SVG (recommended) or PNG
- **Header logo size**: ~210x29px (will scale automatically)
- **Footer logo size**: ~264x78px (will scale automatically)
- **File names**: Keep original names or update paths in components

### Step 3: Replace Files
Replace these files with your logo:
- `happy-paws-site/public/assets/svgs/logo-black.svg` (header)
- `happy-paws-site/public/assets/svgs/logo-white.svg` (footer)

### Step 4: Update Alt Text (Optional)
Edit these files to update the alt text:
- `happy-paws-site/src/components/Header.astro` (line 14)
- `happy-paws-site/src/components/Footer.astro` (line 18)

## Current Logo Locations

### Header Logo
- **File**: `/public/assets/svgs/logo-black.svg`
- **Component**: `src/components/Header.astro`
- **Line**: 13-19
- **Usage**: Dark logo on light background

### Footer Logo
- **File**: `/public/assets/svgs/logo-white.svg`
- **Component**: `src/components/Footer.astro`
- **Line**: 14-21
- **Usage**: Light logo on dark background

## Logo Design Tips

### Best Practices
1. **Scalability**: Use SVG format for crisp display at all sizes
2. **Contrast**: Ensure good visibility on both light and dark backgrounds
3. **Simplicity**: Keep design clean for small sizes
4. **Brand consistency**: Match your organization's visual identity

### Recommended Dimensions
- **Minimum width**: 150px
- **Maximum width**: 300px
- **Aspect ratio**: 3:1 to 7:1 (width:height)
- **File size**: Under 50KB for web optimization

## Testing Your Logo

After updating:
1. Check header on homepage: `http://localhost:4322/`
2. Scroll to footer to verify footer logo
3. Test on mobile devices (responsive design)
4. Verify contrast and readability

## Troubleshooting

### Logo Not Showing
- Check file path is correct
- Ensure file permissions allow reading
- Verify SVG syntax is valid
- Clear browser cache

### Logo Too Large/Small
- Adjust width/height attributes in component files
- Maintain aspect ratio to prevent distortion
- Use CSS for fine-tuning if needed

### Logo Quality Issues
- Use SVG instead of raster formats
- Ensure original design is high resolution
- Check for proper compression
