// Edit organizations record
query "orgs/{orgId}" verb=PATCH {
  input {
    int orgId?=1 filters=min:1
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
      field_name = $input.orgId
      field_value = $input.orgId
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $model
  }

  response = $model
}