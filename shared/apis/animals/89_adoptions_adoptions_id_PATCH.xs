// Edit Adoptions record
query "adoptions/{adoptions_id}" verb=PATCH {
  input {
    int adoptions_id? filters=min:1
    dblink {
      table = "Adoptions"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch Adoptions {
      field_name = "id"
      field_value = $input.adoptions_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $adoptions
  }

  response = $adoptions
}