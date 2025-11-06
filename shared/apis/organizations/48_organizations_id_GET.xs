query "organizations/{id}" verb=GET {
  input {
    int id? filters=min:1
  }

  stack {
    db.get organizations {
      field_name = "id"
      field_value = $input.id
    } as $model
  }

  response = $model
}