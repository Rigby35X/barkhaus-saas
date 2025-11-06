// Delete website_content record.
query "website_content/{org_id}" verb=DELETE {
  input {
    int org_id? filters=min:1
  }

  stack {
    db.del website_content {
      field_name = "id"
      field_value = $input.org_id
    }
  }

  response = null
}