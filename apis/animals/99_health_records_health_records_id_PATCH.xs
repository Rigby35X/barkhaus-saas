// Edit Health Records record
query "health_records/{health_records_id}" verb=PATCH {
  input {
    int health_records_id? filters=min:1
    dblink {
      table = "Health Records"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch "Health Records" {
      field_name = "id"
      field_value = $input.health_records_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $health_records
  }

  response = $health_records
}