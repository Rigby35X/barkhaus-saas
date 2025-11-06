// Get services record
query "services/{services_id}" verb=GET {
  input {
    int services_id? filters=min:1
  }

  stack {
    db.get services {
      field_name = "id"
      field_value = $input.services_id
    } as $services
  
    precondition ($services != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $services
}