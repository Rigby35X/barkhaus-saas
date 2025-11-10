// Get google_reviews record
query "google_reviews/{google_reviews_id}" verb=GET {
  input {
    int google_reviews_id? filters=min:1
  }

  stack {
    db.get google_reviews {
      field_name = "id"
      field_value = $input.google_reviews_id
    } as $google_reviews
  
    precondition ($google_reviews != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $google_reviews
}