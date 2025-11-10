// Delete design_settings record.
query "design_settings/{design_settings_id}" verb=DELETE {
  input {
    int design_settings_id? filters=min:1
  }

  stack {
    db.del design_settings {
      field_name = "id"
      field_value = $input.design_settings_id
    }
  }

  response = null
}