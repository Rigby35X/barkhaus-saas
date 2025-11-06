// Edit design_settings record
query "design_settings/{design_settings_id}" verb=PATCH {
  input {
    int design_settings_id? filters=min:1
    dblink {
      table = "design_settings"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch design_settings {
      field_name = "id"
      field_value = $input.design_settings_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $design_settings
  }

  response = $design_settings
}