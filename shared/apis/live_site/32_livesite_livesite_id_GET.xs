// Get LiveSite record
query "livesite/{livesite_id}" verb=GET {
  input {
    int livesite_id? filters=min:1
  }

  stack {
    db.get site_content {
      field_name = "id"
      field_value = $input.livesite_id
    } as $livesite
  
    precondition ($livesite != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $livesite
}