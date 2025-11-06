# Animal Rescue Website Template System

This template system allows you to quickly generate customized animal rescue and shelter websites using token-based configuration files. Each site can be uniquely branded and customized while maintaining the same high-quality structure and functionality.

## 🎯 Features

- **Token-based customization** - Replace content, branding, and styling with simple configuration files
- **Animal rescue focused** - Specialized pages for adoptions, fostering, volunteering, and donations
- **Multiple site types** - Templates for general rescues, cat sanctuaries, dog rescues, and more
- **Responsive design** - Mobile-first approach with beautiful layouts
- **SEO optimized** - Proper meta tags, structured data, and performance optimization
- **CMS integration** - Built with Decap CMS for easy content management

## 📁 Template Structure

### Core Pages
- **Home** - Hero section, services, about, gallery, testimonials
- **About** - Organization story, mission, team information
- **Our Animals** - Searchable/filterable animal listings
- **Animal Details** - Individual animal profiles with photos and information
- **Applications** - Adoption, foster, and volunteer application forms
- **Donate** - Multiple donation options and impact information
- **Events** - Upcoming and past events with RSVP functionality
- **Contact** - Contact information and inquiry forms

### Key Features
- **Animal filtering** - Filter by type, age, size, special needs
- **Photo galleries** - Multiple photos per animal with lightbox viewing
- **Application tracking** - Streamlined application processes
- **Event management** - Calendar integration and event promotion
- **Donation processing** - Multiple giving options and transparency
- **Volunteer coordination** - Opportunity listings and scheduling

## 🚀 Quick Start

### 1. Generate a New Site

```bash
# Interactive site generator
node scripts/generate-site.js

# Or use a specific config file
node scripts/process-template.js examples/animal-rescue.config.json ./my-rescue-site
```

### 2. Install Dependencies

```bash
cd my-rescue-site
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Deploy

```bash
npm run build
# Deploy the 'dist' folder to your hosting provider
```

## 📝 Configuration

### Template Configuration File

Each template uses a JSON configuration file with tokens that get replaced throughout the site:

```json
{
  "site": {
    "name": "Paws & Hearts Animal Rescue",
    "title": "Saving Lives, Finding Homes",
    "description": "Dedicated to rescuing and rehoming animals in need"
  },
  "organization": {
    "name": "Paws & Hearts Animal Rescue",
    "email": "info@pawsandhearts.org",
    "phone": {
      "tel": "555-PAWS-123",
      "formatted": "(555) PAWS-123"
    }
  },
  "branding": {
    "colors": {
      "primary": "#E67E22",
      "secondary": "#2C3E50"
    },
    "fonts": {
      "primary": "'Nunito', 'Arial', sans-serif"
    }
  }
}
```

### Available Tokens

#### Site Information
- `{{site.name}}` - Organization name
- `{{site.title}}` - Site title for SEO
- `{{site.description}}` - Meta description
- `{{site.domain}}` - Website domain
- `{{site.url}}` - Full website URL

#### Organization Details
- `{{organization.name}}` - Legal organization name
- `{{organization.email}}` - Contact email
- `{{organization.phone.tel}}` - Phone number for tel: links
- `{{organization.phone.formatted}}` - Formatted phone display
- `{{organization.address.*}}` - Address components

#### Branding
- `{{branding.colors.*}}` - Color scheme variables
- `{{branding.fonts.*}}` - Font family definitions
- `{{branding.logo.*}}` - Logo paths and properties

#### Homepage Content
- `{{homepage.hero.*}}` - Hero section content
- `{{homepage.services.*}}` - Service descriptions
- `{{homepage.about.*}}` - About section content
- `{{homepage.gallery.*}}` - Gallery images and content
- `{{homepage.reviews.*}}` - Testimonial content

## 🎨 Customization

### Colors

Update the color scheme in your configuration file:

```json
{
  "branding": {
    "colors": {
      "primary": "#E67E22",        // Main brand color
      "primaryLight": "#F39C12",   // Lighter variant
      "primaryDark": "#D35400",    // Darker variant
      "secondary": "#2C3E50",      // Secondary color
      "accent": "#ECF0F1",         // Accent/background color
      "headerColor": "#2C3E50",    // Heading text color
      "bodyTextColor": "#34495E",  // Body text color
      "bodyTextColorWhite": "#FFFFFF" // White text color
    }
  }
}
```

### Fonts

Customize typography:

```json
{
  "branding": {
    "fonts": {
      "primary": "'Nunito', 'Arial', sans-serif",
      "secondary": "'Open Sans', 'Arial', sans-serif", 
      "headings": "'Nunito', 'Arial', sans-serif"
    }
  }
}
```

### Images

Replace images by updating paths in the configuration:

```json
{
  "homepage": {
    "hero": {
      "backgroundImage": {
        "desktop": "/assets/images/your-hero-image.jpg",
        "mobile": "/assets/images/your-hero-image-mobile.jpg"
      }
    }
  }
}
```

## 📋 Available Templates

### 1. General Animal Rescue (`animal-rescue.config.json`)
- Multi-species rescue organization
- Comprehensive adoption program
- Foster and volunteer opportunities
- Community outreach focus

### 2. Cat Sanctuary (`cat-sanctuary.config.json`)
- Cat-specific rescue and sanctuary
- Special needs and senior cat care
- TNR (Trap-Neuter-Return) programs
- Lifetime sanctuary care

### 3. Dog Rescue (Coming Soon)
- Dog-specific rescue operations
- Breed-specific programs
- Training and behavioral support
- Rehabilitation services

## 🛠 Development

### Adding New Templates

1. Create a new configuration file in the `examples/` directory
2. Follow the existing token structure
3. Customize content for your specific rescue type
4. Test with the template processor

### Modifying Pages

1. Edit the source files in `src/pages/`
2. Add new tokens where needed
3. Update the configuration schema
4. Test with multiple configurations

### Custom Styling

1. Modify the CSS variables in `src/styles/root.less`
2. Add new color tokens to the configuration
3. Update the template processor to handle new tokens

## 📱 Mobile Optimization

All templates are mobile-first and include:
- Responsive navigation
- Touch-friendly interfaces
- Optimized images
- Fast loading times
- Accessible design

## 🔍 SEO Features

- Semantic HTML structure
- Open Graph meta tags
- Twitter Card support
- Structured data markup
- Optimized images with alt text
- Fast loading performance

## 🎯 Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader optimization
- High contrast color schemes
- Focus indicators
- Alternative text for images

## 📊 Analytics & Tracking

Templates include support for:
- Google Analytics
- Facebook Pixel
- Custom event tracking
- Donation tracking
- Adoption success metrics

## 🔧 Technical Requirements

- Node.js 18+
- Modern web browser
- Git for version control
- Text editor or IDE

## 📞 Support

For questions about the template system:
1. Check the documentation
2. Review example configurations
3. Test with the provided examples
4. Contact the development team

## 🚀 Deployment Options

### Vercel (Recommended)
1. Connect your GitHub repository
2. Configure build settings
3. Deploy automatically on push

### Netlify
1. Connect repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`

### Traditional Hosting
1. Run `npm run build`
2. Upload `dist` folder contents
3. Configure web server

## 📈 Performance

Templates are optimized for:
- Core Web Vitals compliance
- Fast loading times
- Efficient image delivery
- Minimal JavaScript
- CSS optimization

## 🔄 Updates

To update your template:
1. Pull latest changes from the template repository
2. Re-run the template processor with your configuration
3. Review and merge changes
4. Test thoroughly before deploying

---

**Ready to create your animal rescue website?** Start with one of our example configurations and customize it for your organization!
