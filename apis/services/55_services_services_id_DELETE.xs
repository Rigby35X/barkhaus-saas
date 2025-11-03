// Delete services record.
query "services/{services_id}" verb=DELETE {
  input {
    int services_id? filters=min:1
  }

  stack {
    db.del services {
      field_name = "id"
      field_value = $input.services_id
    }
  }

  response = null
}