// Query all page_sections records
query page_sections verb=GET {
  input {
  }

  stack {
    db.query page_sections {
      return = {type: "list"}
    } as $page_sections
  }

  response = $page_sections
}