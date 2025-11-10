// Delete tokens_table record.
query "tokens_table/{tokens_table_id}" verb=DELETE {
  input {
    int tokens_table_id? filters=min:1
  }

  stack {
    db.del tokens_table {
      field_name = "id"
      field_value = $input.tokens_table_id
    }
  }

  response = null
}