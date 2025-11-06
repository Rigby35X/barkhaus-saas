table linked_accounts {
  auth = false

  schema {
    int id
    timestamp created_at?=now
  
    // Links to the organization (tenant)
    int org? {
      table = "organizations"
    }
  
    // E.g. google, mailchimp, givebutter
    text provider? filters=trim
  
    // Authentication type: oauth, api_key, etc.
    text auth_type? filters=trim
  
    // Access token (should be stored encrypted)
    text access_token? filters=trim
  
    // Refresh token (optional, for long-lived access)
    text refresh_token? filters=trim
  
    // Permissions granted to the token (e.g. gmail.send)
    text scope? filters=trim
  
    // Timestamp when the token expires
    timestamp expires_at?
  
    // Optional: stores raw token response or other relevant data
    json metadata?
  
    // Timestamp of the last update to the record
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}