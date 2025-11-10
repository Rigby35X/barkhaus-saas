// Query all organizations records
query "orgs/{orgId}" verb=GET {
  input {
    int orgId?=1
  }

  stack {
    db.query organizations {
      return = {type: "list"}
    } as $model
  }

  response = $model
}