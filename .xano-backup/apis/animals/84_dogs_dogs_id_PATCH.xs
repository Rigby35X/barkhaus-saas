// Edit Dogs record
query "dogs/{dogs_id}" verb=PATCH {
  input {
    int dogs_id? filters=min:1
    dblink {
      table = "Dogs"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch Dogs {
      field_name = "id"
      field_value = $input.dogs_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $dogs
  }

  response = $dogs
}