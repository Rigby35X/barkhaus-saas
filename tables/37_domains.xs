table domains {
  auth = false

  schema {
    int id
    int organization_id? {
      table = "organizations"
    }
  
    timestamp created_at?=now
    text domain? filters=trim
    text tenant_slug? filters=trim
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}