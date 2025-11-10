// Delete LiveSite record.
query "livesite/{livesite_id}" verb=DELETE {
  input {
    int livesite_id? filters=min:1
  }

  stack {
    db.del site_content {
      field_name = "id"
      field_value = $input.livesite_id
    }
  }

  response = null
}