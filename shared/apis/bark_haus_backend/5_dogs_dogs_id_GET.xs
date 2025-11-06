// Get Dogs record
query "dogs/{dogs_id}" verb=GET {
  input {
    int dogs_id? filters=min:1
  }

  stack {
    db.get animals {
      field_name = "id"
      field_value = $input.dogs_id
    } as $dogs
  
    precondition ($dogs != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $dogs
}