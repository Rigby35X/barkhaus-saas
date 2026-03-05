/**
 * Paragon SDK Loader
 * Handles loading and initializing the Paragon SDK with multiple fallback methods
 */

class ParagonLoader {
    constructor() {
        this.paragon = null;
        this.isLoaded = false;
        this.isLoading = false;
        this.loadPromise = null;
    }

    /**
     * Load Paragon SDK with multiple fallback methods
     */
    async load() {
        if (this.isLoaded && this.paragon) {
            return this.paragon;
        }

        if (this.isLoading && this.loadPromise) {
            return this.loadPromise;
        }

        this.isLoading = true;
        this.loadPromise = this._loadWithFallbacks();
        
        try {
            const result = await this.loadPromise;
            this.isLoaded = true;
            return result;
        } catch (error) {
            this.isLoading = false;
            throw error;
        }
    }

    /**
     * Try multiple loading methods in sequence
     */
    async _loadWithFallbacks() {
        const methods = [
            () => this._loadFromWindow(),
            () => this._loadFromDynamicImport(), // This method works!
            () => this._loadFromNPM(),
            () => this._loadFromCDN('https://cdn.jsdelivr.net/npm/@useparagon/connect@latest/dist/index.umd.js'),
            () => this._loadFromCDN('https://unpkg.com/@useparagon/connect@latest/dist/index.umd.js'),
            () => this._createMockParagon()
        ];

        for (let i = 0; i < methods.length; i++) {
            try {
                console.log(`Trying Paragon loading method ${i + 1}...`);
                const paragon = await methods[i]();
                if (paragon) {
                    console.log(`Paragon loaded successfully with method ${i + 1}`);
                    this.paragon = paragon;
                    window.paragon = paragon; // Make globally available
                    return paragon;
                }
            } catch (error) {
                console.log(`Method ${i + 1} failed:`, error.message);
                if (i === methods.length - 1) {
                    throw new Error(`All loading methods failed. Last error: ${error.message}`);
                }
            }
        }
    }

    /**
     * Check if Paragon is already loaded globally
     */
    async _loadFromWindow() {
        if (typeof window.Paragon !== 'undefined') {
            return window.Paragon;
        }
        if (typeof window.paragon !== 'undefined') {
            return window.paragon;
        }
        throw new Error('Paragon not found on window object');
    }

    /**
     * Load from installed npm package
     */
    async _loadFromNPM() {
        try {
            const module = await import('/node_modules/@useparagon/connect/dist/index.js');
            return module.paragon || module.default || module;
        } catch (error) {
            throw new Error(`NPM import failed: ${error.message}`);
        }
    }

    /**
     * Load via dynamic import (this method works!)
     */
    async _loadFromDynamicImport() {
        console.log('Attempting dynamic import from Skypack...');

        try {
            const module = await import('https://cdn.skypack.dev/@useparagon/connect');
            console.log('Dynamic import successful, checking module...');

            if (module.paragon) {
                console.log('Found paragon in module');
                return module.paragon;
            } else if (module.default) {
                console.log('Found default export in module');
                return module.default;
            } else {
                console.log('Module keys:', Object.keys(module));
                throw new Error('No paragon object found in dynamic import');
            }
        } catch (error) {
            console.log('Dynamic import failed:', error.message);
            throw new Error(`Dynamic import failed: ${error.message}`);
        }
    }

    /**
     * Load from CDN
     */
    async _loadFromCDN(url) {
        return new Promise((resolve, reject) => {
            console.log(`Attempting to load from CDN: ${url}`);

            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${url}"]`);
            if (existingScript) {
                console.log('Script already exists, checking for Paragon object...');
                if (typeof window.Paragon !== 'undefined') {
                    console.log('Found window.Paragon');
                    resolve(window.Paragon);
                    return;
                } else if (typeof window.paragon !== 'undefined') {
                    console.log('Found window.paragon');
                    resolve(window.paragon);
                    return;
                }
            }

            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            script.onload = () => {
                console.log(`Script loaded from ${url}, checking for Paragon object...`);

                // Check immediately
                if (typeof window.Paragon !== 'undefined') {
                    console.log('Found window.Paragon immediately');
                    resolve(window.Paragon);
                    return;
                } else if (typeof window.paragon !== 'undefined') {
                    console.log('Found window.paragon immediately');
                    resolve(window.paragon);
                    return;
                }

                // Wait for SDK to initialize and check multiple times
                let attempts = 0;
                const maxAttempts = 10;
                const checkInterval = setInterval(() => {
                    attempts++;
                    console.log(`Checking for Paragon object, attempt ${attempts}/${maxAttempts}`);

                    if (typeof window.Paragon !== 'undefined') {
                        console.log('Found window.Paragon after waiting');
                        clearInterval(checkInterval);
                        resolve(window.Paragon);
                    } else if (typeof window.paragon !== 'undefined') {
                        console.log('Found window.paragon after waiting');
                        clearInterval(checkInterval);
                        resolve(window.paragon);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkInterval);
                        console.log('Available window properties:', Object.keys(window).filter(key => key.toLowerCase().includes('paragon')));
                        console.log('All window properties containing "connect":', Object.keys(window).filter(key => key.toLowerCase().includes('connect')));
                        reject(new Error(`Paragon SDK loaded but not available on window after ${maxAttempts} attempts`));
                    }
                }, 200);
            };

            script.onerror = () => {
                console.log(`Failed to load script from ${url}`);
                reject(new Error(`Failed to load from ${url}`));
            };

            document.head.appendChild(script);
            console.log('Script tag added to head');

            // Timeout after 15 seconds
            setTimeout(() => {
                console.log(`Loading timeout for ${url}`);
                reject(new Error(`Loading timeout for ${url}`));
            }, 15000);
        });
    }

    /**
     * Authenticate with Paragon
     */
    async authenticate(projectId, userToken) {
        if (!this.paragon) {
            throw new Error('Paragon SDK not loaded. Call load() first.');
        }

        console.log('Authenticating with Paragon...');
        console.log('Project ID:', projectId);
        console.log('User Token:', userToken);

        try {
            await this.paragon.authenticate(projectId, userToken);
            console.log('Paragon authentication successful');
            return this.paragon.getUser();
        } catch (error) {
            console.error('Paragon authentication failed:', error);
            throw error;
        }
    }

    /**
     * Connect to an integration
     */
    async connect(integrationType) {
        if (!this.paragon) {
            throw new Error('Paragon SDK not loaded and authenticated');
        }

        console.log(`Connecting to ${integrationType}...`);
        return await this.paragon.connect(integrationType);
    }

    /**
     * Get user information
     */
    getUser() {
        if (!this.paragon) {
            throw new Error('Paragon SDK not loaded');
        }
        return this.paragon.getUser();
    }

    /**
     * Get integration metadata
     */
    getIntegrationMetadata() {
        if (!this.paragon) {
            return [];
        }
        
        try {
            return this.paragon.getIntegrationMetadata ? 
                this.paragon.getIntegrationMetadata() : 
                [{ type: 'mailchimp', name: 'Mailchimp', icon: '📧' }];
        } catch (error) {
            console.error('Failed to get integration metadata:', error);
            return [{ type: 'mailchimp', name: 'Mailchimp', icon: '📧' }];
        }
    }

    /**
     * Subscribe to events
     */
    subscribe(event, callback) {
        if (!this.paragon || !this.paragon.subscribe) {
            console.log('Event subscription not available');
            return;
        }

        try {
            this.paragon.subscribe(event, callback);
        } catch (error) {
            console.error('Failed to subscribe to event:', error);
        }
    }

    /**
     * Create a mock Paragon object for testing when real SDK fails
     */
    async _createMockParagon() {
        console.log('Creating mock Paragon object for testing...');

        const mockParagon = {
            authenticate: async (projectId, userToken) => {
                console.log('Mock authenticate called with:', { projectId, userToken });
                return Promise.resolve({
                    authenticated: true,
                    user: { id: 'mock-user', integrations: {} }
                });
            },

            getUser: () => {
                return {
                    authenticated: true,
                    id: 'mock-user',
                    integrations: {
                        mailchimp: { enabled: false }
                    }
                };
            },

            getIntegrationMetadata: () => {
                return [
                    {
                        type: 'mailchimp',
                        name: 'Mailchimp',
                        icon: '📧',
                        description: 'Email marketing platform'
                    }
                ];
            },

            connect: async (integrationType) => {
                console.log('Mock connect called for:', integrationType);
                alert(`Mock Paragon: Would connect to ${integrationType}\n\nThis is a test mode - real integration requires the actual Paragon SDK.`);
                return Promise.resolve({ success: true, mock: true });
            },

            subscribe: (event, callback) => {
                console.log('Mock subscribe called for event:', event);
            },

            _isMock: true
        };

        console.log('Mock Paragon object created');
        return mockParagon;
    }
}

// Create global instance
window.ParagonLoader = ParagonLoader;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParagonLoader;
}
