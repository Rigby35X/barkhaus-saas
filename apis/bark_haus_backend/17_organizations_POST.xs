// Add organizations record
query organizations verb=POST {
  input {
    dblink {
      table = "organizations"
    }
  }

  stack {
    db.add organizations {
      data = {created_at: "now"}
    } as $organizations
  }

  response = $organizations
}