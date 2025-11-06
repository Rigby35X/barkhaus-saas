table user {
  auth = true

  schema {
    int id
    int? org? {
      table = "organizations"
    }
  
    email? email filters=trim|lower
    password? password filters=min:8|minAlpha:1|minDigit:1
    text first_name filters=trim
    text last_Name? filters=trim
    text role? filters=trim
    timestamp created_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
  ]
}