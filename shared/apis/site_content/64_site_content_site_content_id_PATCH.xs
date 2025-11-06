// Edit site_content record
query "site_content/{site_content_id}" verb=PATCH {
  input {
    int site_content_id? filters=min:1
    dblink {
      table = "site_content"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch site_content {
      field_name = "id"
      field_value = $input.site_content_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $model
  }

  response = $model
}