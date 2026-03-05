query "animals" verb=POST {
  input {
    dblink {
      table = "mbpr_puppies"
    }
  }

  stack {
    db.add mbpr_puppies {
      data = $input
    } as $animal
  }

  response = $animal
}
