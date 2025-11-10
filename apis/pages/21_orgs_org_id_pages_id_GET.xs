// Get Pages record
query "orgs/{orgId}/pages/{id}" verb=GET {
  input {
    int pages_id? filters=min:1
  }

  stack {
    db.get pages {
      field_name = "id"
      field_value = $input.pages_id
    } as $pages
  
    precondition ($pages != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $pages
}