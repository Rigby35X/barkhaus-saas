// Add google_reviews record
query google_reviews verb=POST {
  input {
    dblink {
      table = "google_reviews"
    }
  }

  stack {
    db.add google_reviews {
      data = {created_at: "now"}
    } as $google_reviews
  }

  response = $google_reviews
}