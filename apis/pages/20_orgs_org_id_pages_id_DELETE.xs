// Delete Pages record.
query "orgs/{orgId}/pages/{id}" verb=DELETE {
  input {
    int pages_id? filters=min:1
  }

  stack {
    db.del pages {
      field_name = "id"
      field_value = $input.pages_id
    }
  }

  response = null
}