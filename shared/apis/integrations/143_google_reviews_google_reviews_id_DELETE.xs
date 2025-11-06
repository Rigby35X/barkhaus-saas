// Delete google_reviews record.
query "google_reviews/{google_reviews_id}" verb=DELETE {
  input {
    int google_reviews_id? filters=min:1
  }

  stack {
    db.del google_reviews {
      field_name = "id"
      field_value = $input.google_reviews_id
    }
  }

  response = null
}