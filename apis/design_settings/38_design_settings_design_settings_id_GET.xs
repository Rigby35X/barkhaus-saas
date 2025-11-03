// Get design_settings record
query "design_settings/{design_settings_id}" verb=GET {
  input {
    int design_settings_id? filters=min:1
  }

  stack {
    db.get design_settings {
      field_name = "id"
      field_value = $input.design_settings_id
    } as $design_settings
  
    precondition ($design_settings != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $design_settings
}