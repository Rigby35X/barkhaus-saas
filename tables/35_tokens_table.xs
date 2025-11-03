table tokens_table {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  
    // References the organization (tenant)
    int org? {
      table = "organizations"
    }
  
    // References the authenticated user
    int user_id? {
      table = "user"
    }
  
    // Short-lived access token (should be stored encrypted)
    text access_token? filters=trim
  
    // Used to renew access tokens (should be stored encrypted)
    text refresh_token? filters=trim
  
    // Timestamp when the access token expires
    timestamp token_expiry?
  
    // Timestamp of the last update to the record
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}