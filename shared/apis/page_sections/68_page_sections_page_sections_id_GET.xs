// Get page_sections record
query "page_sections/{page_sections_id}" verb=GET {
  input {
    int page_sections_id? filters=min:1
  }

  stack {
    db.get page_sections {
      field_name = "id"
      field_value = $input.page_sections_id
    } as $model
  
    precondition ($model != null) {
      error_type = "notfound"
      error = "Not Found"
    }
  }

  response = $model
}