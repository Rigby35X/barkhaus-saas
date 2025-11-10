// Query all Health Records records
query health_records verb=GET {
  input {
  }

  stack {
    db.query "Health Records" {
      return = {type: "list"}
    } as $health_records
  }

  response = $health_records
}