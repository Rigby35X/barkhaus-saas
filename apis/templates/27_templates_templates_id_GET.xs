// Get Templates record
query "templates/{templates_id}" verb=GET {
  input {
    int templates_id? filters=min:1
  }

  stack {
    db.get Templates {
      field_name = "id"
      field_value = $input.templates_id
    } as $templates
  
    precondition ($templates != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $templates
}