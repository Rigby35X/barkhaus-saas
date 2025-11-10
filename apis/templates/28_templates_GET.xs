// Query all Templates records
query templates verb=GET {
  input {
  }

  stack {
    db.query Templates {
      return = {type: "list"}
    } as $templates
  }

  response = $templates
}