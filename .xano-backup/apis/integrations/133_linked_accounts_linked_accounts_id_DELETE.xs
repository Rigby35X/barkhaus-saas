// Delete linked_accounts record.
query "linked_accounts/{linked_accounts_id}" verb=DELETE {
  input {
    int linked_accounts_id? filters=min:1
  }

  stack {
    db.del linked_accounts {
      field_name = "id"
      field_value = $input.linked_accounts_id
    }
  }

  response = null
}