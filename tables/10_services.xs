// for dynamic services
table services {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    int? org? {
      table = "organizations"
    }
  
    // Name of the service
    text name? filters=trim
  
    // Description of the service
    text description? filters=trim
  
    // URL for an icon representing the service
    text icon_url? filters=trim
  
    // Indicates if the service is active and visible
    bool is_active?
  
    // Order in which the service should appear
    int sort_order?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}