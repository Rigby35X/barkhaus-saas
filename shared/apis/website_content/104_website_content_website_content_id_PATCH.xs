// Edit website_content record
query "website_content/{website_content_id}" verb=PATCH {
  input {
    int website_content_id?=1 filters=min:1
    dblink {
      table = "website_content"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch website_content {
      field_name = "id"
      field_value = $input.website_content_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $model
  }

  response = $model
}