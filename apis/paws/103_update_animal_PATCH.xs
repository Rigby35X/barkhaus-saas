query "animals/{id}" verb=PATCH {
  input {
    dblink {
      table = "mbpr_puppies"
    }
    int id?
  }

  stack {
    db.edit mbpr_puppies {
      return = "single"
      filter = {
        id = $input.id
      }
      data = $input
    } as $animal
  }

  response = $animal
}
