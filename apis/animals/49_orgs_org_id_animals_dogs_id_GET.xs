// Update a dog
query "orgs/{orgId}/animals/{dogs_id}" verb=GET {
  input {
    int dogs_id? filters=min:1
    dblink {
      table = "animals"
    }
  
    int orgId?
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.get animals {
      field_name = "id"
      field_value = $input.dogs_id
    } as $model
  }

  response = $model
}