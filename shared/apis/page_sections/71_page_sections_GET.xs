// Query all page_sections records
query page_sections verb=GET {
  input {
  }

  stack {
    db.query page_sections {
      return = {type: "list"}
    } as $model
  }

  response = $model
}