// Add tokens_table record
query tokens_table verb=POST {
  input {
    dblink {
      table = "tokens_table"
    }
  }

  stack {
    db.add tokens_table {
      data = {created_at: "now"}
    } as $tokens_table
  }

  response = $tokens_table
}