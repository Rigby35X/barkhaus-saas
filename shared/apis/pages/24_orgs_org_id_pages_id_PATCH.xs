// Edit Pages record
query "orgs/{orgId}/pages/{id}" verb=PATCH {
  input {
    int pages_id? filters=min:1
    dblink {
      table = "pages"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch pages {
      field_name = "id"
      field_value = $input.pages_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $pages
  }

  response = $pages
}