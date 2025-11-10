// Get linked_accounts record
query "linked_accounts/{linked_accounts_id}" verb=GET {
  input {
    int linked_accounts_id? filters=min:1
  }

  stack {
    db.get linked_accounts {
      field_name = "id"
      field_value = $input.linked_accounts_id
    } as $linked_accounts
  
    precondition ($linked_accounts != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $linked_accounts
}