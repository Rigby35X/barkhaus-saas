// Get site_content record
query "site_content/{site_content_id}" verb=GET {
  input {
    int site_content_id? filters=min:1
  }

  stack {
    db.get site_content {
      field_name = "id"
      field_value = $input.site_content_id
    } as $model
  
    precondition ($model != null) {
      error_type = "notfound"
      error = "Not Found"
    }
  }

  response = $model
}