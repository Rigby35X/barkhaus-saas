// Get Adoptions record
query "adoptions/{adoptions_id}" verb=GET {
  input {
    int adoptions_id? filters=min:1
  }

  stack {
    db.get Adoptions {
      field_name = "id"
      field_value = $input.adoptions_id
    } as $adoptions
  
    precondition ($adoptions != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $adoptions
}