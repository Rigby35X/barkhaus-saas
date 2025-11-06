// Query all google_reviews records
query google_reviews verb=GET {
  input {
  }

  stack {
    db.query google_reviews {
      return = {type: "list"}
    } as $model
  }

  response = $model
}