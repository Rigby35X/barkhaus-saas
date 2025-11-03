// Delete organizations record.
query "organizations/{organizations_id}" verb=DELETE {
  input {
    int organizations_id? filters=min:1
  }

  stack {
    db.del organizations {
      field_name = "id"
      field_value = $input.organizations_id
    }
  }

  response = null
}