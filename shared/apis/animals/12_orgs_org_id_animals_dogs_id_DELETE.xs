// Remove a dog
query "orgs/{orgId}/animals/{dogs_id}" verb=DELETE {
  input {
    int dogs_id? filters=min:1
    int orgId?
  }

  stack {
    db.del animals {
      field_name = "id"
      field_value = $input.dogs_id
    }
  }

  response = null
}