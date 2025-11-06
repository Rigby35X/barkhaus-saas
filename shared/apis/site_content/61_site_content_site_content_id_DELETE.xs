// Delete site_content record
query "site_content/{site_content_id}" verb=DELETE {
  input {
    int site_content_id? filters=min:1
  }

  stack {
    db.del site_content {
      field_name = "id"
      field_value = $input.site_content_id
    }
  }

  response = null
}