// Edit organizations record
query "organizations/{organizations_id}" verb=PATCH {
  input {
    int organizations_id? filters=min:1
    dblink {
      table = "organizations"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch organizations {
      field_name = "id"
      field_value = $input.organizations_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $organizations
  }

  response = $organizations
}