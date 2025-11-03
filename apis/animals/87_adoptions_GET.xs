// Query all Adoptions records
query adoptions verb=GET {
  input {
  }

  stack {
    db.query Adoptions {
      return = {type: "list"}
    } as $adoptions
  }

  response = $adoptions
}