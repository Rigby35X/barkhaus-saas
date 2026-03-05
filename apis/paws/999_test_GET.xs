query "test" verb=GET {
  input {
    int org_id?
  }

  stack {
    db.query mbpr_puppies {
      return = {type: "list"}
    } as $model
  }

  response = $model
}
