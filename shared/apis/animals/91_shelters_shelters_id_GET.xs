// Get Shelters record
query "shelters/{shelters_id}" verb=GET {
  input {
    int shelters_id? filters=min:1
  }

  stack {
    db.get Shelters {
      field_name = "id"
      field_value = $input.shelters_id
    } as $shelters
  
    precondition ($shelters != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $shelters
}