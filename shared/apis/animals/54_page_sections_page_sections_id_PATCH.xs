// Edit page_sections record
query "page_sections/{page_sections_id}" verb=PATCH {
  input {
    int page_sections_id? filters=min:1
    dblink {
      table = "page_sections"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch page_sections {
      field_name = "id"
      field_value = $input.page_sections_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $page_sections
  }

  response = $page_sections
}