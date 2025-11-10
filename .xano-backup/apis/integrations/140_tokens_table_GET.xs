// Query all tokens_table records
query tokens_table verb=GET {
  input {
  }

  stack {
    db.query tokens_table {
      return = {type: "list"}
    } as $tokens_table
  }

  response = $tokens_table
}