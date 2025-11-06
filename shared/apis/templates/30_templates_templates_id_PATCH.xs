// Edit Templates record
query "templates/{templates_id}" verb=PATCH {
  input {
    int templates_id? filters=min:1
    dblink {
      table = "Templates"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch Templates {
      field_name = "id"
      field_value = $input.templates_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $templates
  }

  response = $templates
}