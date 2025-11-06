// Edit google_reviews record
query "google_reviews/{google_reviews_id}" verb=PATCH {
  input {
    int google_reviews_id? filters=min:1
    dblink {
      table = "google_reviews"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch google_reviews {
      field_name = "id"
      field_value = $input.google_reviews_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $google_reviews
  }

  response = $google_reviews
}