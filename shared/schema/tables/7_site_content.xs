table site_content {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int? org? {
      table = "organizations"
    }
  
    // Name of the live website (e.g., 'Mission Bay Puppy Rescue')
    text site_name? filters=trim
  
    // A short, catchy phrase describing the organization
    text tagline? filters=trim
  
    // Phone number for the organization
    text phone? filters=trim
  
    // Contact email address for the organization
    text email? filters=trim
  
    // Operating hours in JSON format (e.g., { 'mon': '9–5' })
    json hours_json?
  
    // URL for the organization's Facebook page
    text facebook_url? filters=trim
  
    // URL for the organization's Instagram profile
    text instagram_url? filters=trim
  
    // Link to the organization's donation page or campaign
    text donation_link? filters=trim
  
    // Indicates if Petfinder integration is enabled for the live site
    bool petfinder_enabled?
  
    // Indicates if Adopt-a-Pet integration is enabled for the live site
    bool adoptapet_enabled?
  
    // Indicates if Givebutter integration is enabled
    bool givebutter_enabled?
  
    // URL for the Givebutter campaign or profile
    text givebutter_url? filters=trim
  
    // Indicates if Donorbox integration is enabled
    bool donorbox_enabled?
  
    // URL for the Donorbox campaign or profile
    text donorbox_url? filters=trim
  
    // Indicates if GoFundMe integration is enabled
    bool gofundme_enabled?
  
    // URL for the GoFundMe campaign or profile
    text gofundme_url? filters=trim
  
    // Indicates if Bloomerang integration is enabled
    bool bloomerang_enabled?
  
    // Indicates if Petfundr integration is enabled
    bool petfundr_enabled?
  
    // Indicates if Cuddly integration is enabled
    bool cuddly_enabled?
  
    // Detailed mission statement for the organization
    text mission_statement? filters=trim
  
    // First line of the physical address of the organization
    text address_line1? filters=trim
  
    // Second line of the physical address of the organization
    text address_line2? filters=trim
  
    // URL for the organization's Twitter profile
    text twitter_url? filters=trim
  
    // URL for the organization's TikTok profile
    text tiktok_url? filters=trim
  
    // Google Analytics tracking ID for the site
    text google_analytics_id? filters=trim
  
    // Custom meta description for SEO and social sharing
    text meta_description? filters=trim
  
    // Custom meta keywords for SEO
    text meta_keywords? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}