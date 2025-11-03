// Query all linked_accounts records
query linked_accounts verb=GET {
  input {
  }

  stack {
    db.query linked_accounts {
      return = {type: "list"}
    } as $linked_accounts
  }

  response = $linked_accounts
}