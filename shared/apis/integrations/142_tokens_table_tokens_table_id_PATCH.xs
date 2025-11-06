// Edit tokens_table record
query "tokens_table/{tokens_table_id}" verb=PATCH {
  input {
    int tokens_table_id? filters=min:1
    dblink {
      table = "tokens_table"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch tokens_table {
      field_name = "id"
      field_value = $input.tokens_table_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $tokens_table
  }

  response = $tokens_table
}