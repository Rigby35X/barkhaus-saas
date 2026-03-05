query "animals" verb=GET {
  input {
    int org?
  }

  stack {
    var $org_id {
      value = $input.org ?: 9
    }

    db.query mbpr_puppies {
      return = {
        type = "list"
        filter = {
          org = $org_id
        }
      }
    } as $animals
  }

  response = $animals
}
