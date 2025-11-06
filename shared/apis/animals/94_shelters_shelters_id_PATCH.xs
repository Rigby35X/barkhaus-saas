// Edit Shelters record
query "shelters/{shelters_id}" verb=PATCH {
  input {
    int shelters_id? filters=min:1
    dblink {
      table = "Shelters"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch Shelters {
      field_name = "id"
      field_value = $input.shelters_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $shelters
  }

  response = $shelters
}