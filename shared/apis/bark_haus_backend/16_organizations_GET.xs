// Query all organizations records
query organizations verb=GET {
  input {
  }

  stack {
    db.query organizations {
      return = {type: "list"}
    } as $organizations
  }

  response = $organizations
}