// Delete Adoptions record.
query "adoptions/{adoptions_id}" verb=DELETE {
  input {
    int adoptions_id? filters=min:1
  }

  stack {
    db.del Adoptions {
      field_name = "id"
      field_value = $input.adoptions_id
    }
  }

  response = null
}