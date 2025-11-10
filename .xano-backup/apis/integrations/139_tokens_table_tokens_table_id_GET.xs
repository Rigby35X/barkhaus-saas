// Get tokens_table record
query "tokens_table/{tokens_table_id}" verb=GET {
  input {
    int tokens_table_id? filters=min:1
  }

  stack {
    db.get tokens_table {
      field_name = "id"
      field_value = $input.tokens_table_id
    } as $tokens_table
  
    precondition ($tokens_table != null) {
      error_type = "notfound"
      error = "Not Found."
    }
  }

  response = $tokens_table
}