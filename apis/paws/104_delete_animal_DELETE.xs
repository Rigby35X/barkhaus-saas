query "animals/{id}" verb=DELETE {
  input {
    int id?
  }

  stack {
    db.delete mbpr_puppies {
      filter = {
        id = $input.id
      }
    } as $result
  }

  response = {
    success: true
  }
}
