table google_reviews {
  auth = false

  schema {
    int id
    timestamp created_at?=now
    text author_name? filters=trim
    int rating?
    text review_text? filters=trim
    timestamp? review_time?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "gin", field: [{name: "xdo", op: "jsonb_path_op"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}