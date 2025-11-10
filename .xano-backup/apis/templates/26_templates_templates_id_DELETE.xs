// Delete Templates record.
query "templates/{templates_id}" verb=DELETE {
  input {
    int templates_id? filters=min:1
  }

  stack {
    db.del Templates {
      field_name = "id"
      field_value = $input.templates_id
    }
  }

  response = null
}