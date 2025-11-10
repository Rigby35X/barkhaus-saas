// Get Health Records record
query "health_records/{health_records_id}" verb=GET {
  input {
    int health_records_id? filters=min:1
  }

  stack {
    db.get "Health Records" {
      field_name = "id"
      field_value = $input.health_records_id
    } as $health_records
  
    precondition ($health_records != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $health_records
}