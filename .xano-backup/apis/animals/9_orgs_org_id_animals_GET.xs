// Returns a list of all available dogs
query "orgs/{orgId}/animals" verb=GET {
  input {
    int orgId?
    int limit?
    int offset?
  }

  stack {
    db.query animals {
      where = $db.animals.org == $input.orgId
      return = {type: "list"}
    } as $model
  }

  response = $model
}