table site_config {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int? org? {
      table = "organizations"
    }
  
    // The name of the website
    text orgName? filters=trim
  
    text slug? filters=trim
    email email? filters=trim|lower
    int phone?
  
    // URL for the site's logo image
    text logoUrl? filters=trim
  
    // The mission statement for the organization's site
    text mission_statement? filters=trim
  
    text tagline? filters=trim
  
    // The primary color used for the site's branding (e.g., hex code)
    text primaryColor? filters=trim
  
    text secondaryColor? filters=trim
    text fontHeading? filters=trim
    text fontBody? filters=trim
    text addressLine1? filters=trim
    text addressLine2? filters=trim
  
    // Optional custom domain name for the site
    text custom_domain? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}