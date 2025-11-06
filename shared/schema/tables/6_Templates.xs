table Templates {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  
    // Name of the template, e.g., 'Modern Rescue'
    text name? filters=trim
  
    // A short summary of the template
    text description? filters=trim
  
    // URL for a preview image of the template
    text thumbnail_url? filters=trim
  
    // GrapesJS component JSON export for the template
    text skeleton_json? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}