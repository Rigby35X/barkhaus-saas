# 🚀 Quick Start Guide - Animal Rescue Website Templates

Get your animal rescue website up and running in minutes with our template system!

## ⚡ 5-Minute Setup

### Step 1: Choose Your Template
We have pre-configured templates for different types of animal rescues:

- **🐕🐱 General Animal Rescue** - Multi-species rescue (dogs, cats, small animals)
- **🐱 Cat Sanctuary** - Cat-specific rescue and sanctuary
- **🐕 Dog Rescue** - Dog-specific rescue operations (coming soon)

### Step 2: Generate Your Site

```bash
# Interactive setup (recommended for beginners)
node scripts/generate-site.js

# Or use a specific template directly
node scripts/process-template.js examples/animal-rescue.config.json ./my-rescue-site
```

### Step 3: Install & Run

```bash
cd my-rescue-site
npm install
npm run dev
```

Your site will be available at `http://localhost:4321` 🎉

## 🎨 Quick Customization

### Update Basic Information

Edit your generated `src/data/client.json`:

```json
{
  "name": "Your Rescue Name",
  "email": "info@yourrescue.org", 
  "phoneForTel": "555-123-4567",
  "phoneFormatted": "(555) 123-4567",
  "address": {
    "lineOne": "123 Rescue Street",
    "city": "Your City",
    "state": "Your State",
    "zip": "12345"
  }
}
```

### Change Colors

Update `src/styles/root.less`:

```less
:root {
  --primary: #E67E22;        /* Your main brand color */
  --primaryLight: #F39C12;   /* Lighter version */
  --primaryDark: #D35400;    /* Darker version */
}
```

### Replace Images

1. Add your images to `public/assets/images/`
2. Update image paths in your pages
3. Recommended image sizes:
   - Hero images: 1920x1080px
   - Animal photos: 800x600px
   - Logo: 300x100px (SVG preferred)

## 📄 Essential Pages Included

### 🏠 Homepage
- Hero section with call-to-action
- Services overview (adoption, foster, volunteer)
- About section with mission
- Success stories gallery
- Testimonials

### 🐾 Our Animals
- Searchable animal listings
- Filter by type, age, size
- Individual animal detail pages
- Adoption status tracking

### 📝 Applications
- **Adoption Application** - For potential adopters
- **Foster Application** - For foster families  
- **Volunteer Application** - For volunteers

### 💝 Donate
- Multiple donation levels
- Monthly giving options
- Impact transparency
- Wishlist integration

### 📅 Events
- Upcoming adoption events
- Fundraising events
- Volunteer opportunities
- Event registration

### 📞 Contact
- Contact form
- Location information
- Hours of operation
- Social media links

## 🔧 Common Customizations

### Add Your Logo

1. Save your logo as `public/assets/images/logo.svg`
2. Update `src/components/Header.astro`:

```astro
<img src="/assets/images/logo.svg" alt="Your Rescue Name" width="200" height="60" />
```

### Update Navigation

Edit `src/data/navData.json`:

```json
[
  {"key": "Home", "url": "/"},
  {"key": "About", "url": "/about/"},
  {"key": "Our Animals", "url": "/our-animals/"},
  {"key": "Applications", "url": "/applications/"},
  {"key": "Donate", "url": "/donate/"},
  {"key": "Events", "url": "/events/"},
  {"key": "Contact", "url": "/contact/"}
]
```

### Add Your Animals

Update the animal data in `src/pages/our-animals.astro`:

```javascript
const animals = [
  {
    id: "buddy",
    name: "Buddy",
    type: "Dog", 
    breed: "Golden Retriever",
    age: "3 years",
    gender: "Male",
    size: "Large",
    status: "Available",
    image: "/assets/images/animals/buddy.jpg",
    description: "Buddy is a friendly dog who loves playing fetch...",
    goodWithKids: true,
    goodWithCats: true,
    goodWithDogs: true
  }
  // Add more animals...
];
```

## 🌐 Deploy Your Site

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Import your repository
4. Deploy automatically!

### Option 2: Netlify

1. Push code to GitHub
2. Connect to [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### Option 3: Traditional Hosting

```bash
npm run build
# Upload the 'dist' folder to your web host
```

## 📱 Mobile-Ready Features

✅ Responsive design works on all devices  
✅ Touch-friendly navigation  
✅ Optimized images for fast loading  
✅ Mobile-first approach  

## 🔍 SEO Optimized

✅ Proper meta tags for search engines  
✅ Open Graph tags for social sharing  
✅ Fast loading performance  
✅ Semantic HTML structure  

## ♿ Accessibility Features

✅ Screen reader compatible  
✅ Keyboard navigation support  
✅ High contrast colors  
✅ Alternative text for images  

## 🎯 Next Steps

### Content Management
- Set up Decap CMS for easy content editing
- Train staff on updating animal listings
- Create content guidelines

### Integrations
- Connect donation processing (PayPal, Stripe)
- Set up email newsletter (Mailchimp, ConvertKit)
- Add social media feeds
- Integrate with PetFinder or Adopt-a-Pet

### Analytics
- Add Google Analytics
- Set up conversion tracking
- Monitor adoption success rates

### Advanced Features
- Online adoption applications
- Foster family portal
- Volunteer scheduling system
- Event registration system

## 🆘 Need Help?

### Common Issues

**Site won't start?**
- Make sure Node.js 18+ is installed
- Run `npm install` in your project directory
- Check for error messages in the terminal

**Images not showing?**
- Verify image paths start with `/assets/images/`
- Check that images exist in `public/assets/images/`
- Ensure image file names match exactly (case-sensitive)

**Colors not changing?**
- Clear browser cache
- Check CSS syntax in `src/styles/root.less`
- Restart development server

### Resources
- 📖 [Full Documentation](README-TEMPLATE-SYSTEM.md)
- 🎨 [Customization Guide](CUSTOMIZATION-GUIDE.md)
- 🐛 [Troubleshooting](TROUBLESHOOTING.md)

---

**🎉 Congratulations!** You now have a professional animal rescue website. Start saving lives and finding forever homes! 🐾
