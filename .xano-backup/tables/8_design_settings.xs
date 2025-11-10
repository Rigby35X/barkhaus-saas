table design_settings {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int? org? {
      table = "organizations"
    }
  
    // Name of the design template (e.g., 'BarkhausClassic', 'Minimal')
    text template_name? filters=trim
  
    // Font family used for headings
    text heading_font? filters=trim
  
    // Font family used for body text
    text body_font? filters=trim
  
    // Google Fonts link for auto-filling font imports
    text google_heading_font_link? filters=trim
  
    text google_body_font_link? filters=trim
  
    // Primary color of the design (HEX value)
    text primary_color? filters=trim
  
    // Secondary color of the design (HEX value)
    text secondary_color? filters=trim
  
    // Background color of the design (HEX value)
    text background_color? filters=trim
  
    // Text/font color of the design (HEX value)
    text font_color? filters=trim
  
    json enabled_sections?
  
    // Accent color of the design (HEX value)
    text accent_color? filters=trim
  
    // Color for buttons in the design (HEX value)
    text button_color? filters=trim
  
    // Color for links in the design (HEX value)
    text link_color? filters=trim
  
    // Style type for the site's header (e.g., 'classic', 'minimal')
    text header_style? filters=trim
  
    // Style type for the site's footer (e.g., 'simple', 'detailed')
    text footer_style? filters=trim
  
    // URL for the site's main logo image
    text logo_url? filters=trim
  
    // URL for the site's favicon image
    text favicon_url? filters=trim
  
    // Custom CSS overrides for the design
    text custom_css? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}