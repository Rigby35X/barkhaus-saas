// Delete Dogs record.
query "dogs/{dogs_id}" verb=DELETE {
  input {
    int dogs_id? filters=min:1
  }

  stack {
    db.del animals {
      field_name = "id"
      field_value = $input.dogs_id
    }
  }

  response = null
}