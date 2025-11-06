table page_sections {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int? org? {
      table = "organizations"
    }
  
    // Name of the section (e.g., 'hero', 'about', 'services')
    text section_name? filters=trim
  
    // Indicates if the section is enabled/visible
    bool is_enabled?
  
    // Order in which the section should appear on the page
    int sort_order?
  
    // Flexible content structure for the section, typically JSON
    json content_json?
  
    // Custom CSS overrides for this specific section
    text custom_css? filters=trim
  
    // Styling preset or custom style identifier for the section
    text section_style? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}