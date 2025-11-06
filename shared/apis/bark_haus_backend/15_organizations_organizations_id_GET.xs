// Get organizations record
query "organizations/{organizations_id}" verb=GET {
  input {
    int organizations_id? filters=min:1
  }

  stack {
    db.get organizations {
      field_name = "id"
      field_value = $input.organizations_id
    } as $organizations
  
    precondition ($organizations != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $organizations
}