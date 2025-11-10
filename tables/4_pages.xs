table pages {
  auth = false

  schema {
    int id
    int? org? {
      table = "organizations"
    }
  
    text path? filters=trim
    text title? filters=trim
    timestamp created_at?=now
  
    // Stores the content of the page, potentially in JSON format (GrapesJS export)
    text content_json? filters=trim
  
    text key? filters=trim
    text status? filters=trim
    int sort_order?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}