// Edit LiveSite record
query "livesite/{livesite_id}" verb=PATCH {
  input {
    int livesite_id? filters=min:1
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
      field_value = $input.livesite_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $livesite
  }

  response = $livesite
}