table organizations {
  auth = false

  schema {
    int id
    text org? filters=trim
    text slug? filters=trim
    email email? filters=trim|lower
    text phone? filters=trim
    text address? filters=trim
    text city? filters=trim
    text state? filters=trim
    text zip_code? filters=trim
  
    // Unique subdomain for multi-tenant routing
    text subdomain? filters=trim
  
    // Custom domain name associated with the organization
    text custom_domain? filters=trim
  
    // Official website URL of the organization
    text website? filters=trim
  
    // Tax identification number of the organization
    text ein? filters=trim
  
    // Boolean indicating if the organization is active
    bool is_active?
  
    timestamp created_at?=now
  
    // URL to organization's logo image
    text logo_light_url? filters=trim
  
    text logo_dark_url? filters=trim
    text favicon_url? filters=trim
    text heading_font? filters=trim
    text body_font? filters=trim
  
    // Main brand color (hex code)
    text primary_color? filters=trim
  
    // Secondary brand color (hex code)
    text secondary_color? filters=trim
  
    // Accent color for highlights (hex code)
    text accent_color? filters=trim
  
    text text_color? filters=trim
    text background_color? filters=trim
  
    // Facebook page URL
    text facebook_url? filters=trim
  
    // Instagram profile URL
    text instagram_url? filters=trim
  
    // Twitter profile URL
    text twitter_url? filters=trim
  
    // YouTube channel URL
    text youtube_url? filters=trim
  
    // LinkedIn page URL
    text linkedin_url? filters=trim
  
    // Main contact email address
    text contact_email? filters=trim
  
    // Support/help email address
    text support_email? filters=trim
  
    // Organization's email domain (e.g., @mbpr.org)
    text email_domain? filters=trim
  
    // Organization's mission statement
    text mission_statement? filters=trim
  
    // Year the organization was founded
    int founded_year?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}