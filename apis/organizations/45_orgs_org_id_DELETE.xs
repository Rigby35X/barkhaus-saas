// Delete organizations record
query "orgs/{orgId}" verb=DELETE {
  input {
    int orgId?=1
    text id? filters=trim
  }

  stack {
    db.del organizations {
      field_name = "id"
      field_value = $input.id
    }
  }

  response = null
}