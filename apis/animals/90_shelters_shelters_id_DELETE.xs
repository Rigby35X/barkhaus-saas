// Delete Shelters record.
query "shelters/{shelters_id}" verb=DELETE {
  input {
    int shelters_id? filters=min:1
  }

  stack {
    db.del Shelters {
      field_name = "id"
      field_value = $input.shelters_id
    }
  }

  response = null
}