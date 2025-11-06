// Paragon SDK Integration
import { paragon } from '@useparagon/connect';

// Initialize Paragon when the page loads
document.addEventListener('astro:page-load', () => {
  console.log('🔗 Paragon SDK loaded and ready');
  
  // Initialize Paragon with your configuration
  // You can add your Paragon project ID and other configuration here
  // Example:
  // paragon.init({
  //   projectId: 'your-project-id',
  //   // other configuration options
  // });
});

// Export paragon for use in other modules if needed
export { paragon };