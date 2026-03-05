// Delete organizations record
query "orgs/{orgId}" verb=DELETE {
  input {
    int id? filters=min:1
    text orgId? filters=trim
  }

  stack {
    db.del organizations {
      field_name = "id"
      field_value = $input.id
    }
  }

  response = null
}