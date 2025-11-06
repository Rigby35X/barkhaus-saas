// Edit services record
query "services/{services_id}" verb=PATCH {
  input {
    int services_id? filters=min:1
    dblink {
      table = "services"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch services {
      field_name = "id"
      field_value = $input.services_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $services
  }

  response = $services
}