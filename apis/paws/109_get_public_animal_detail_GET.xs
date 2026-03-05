query "public/animals/{id}" verb=GET {
  input {
    int id?
  }

  stack {
    db.query mbpr_puppies {
      return = {
        type = "single"
        filter = {
          id = $input.id
        }
      }
    } as $animal
  }

  response = $animal
}
