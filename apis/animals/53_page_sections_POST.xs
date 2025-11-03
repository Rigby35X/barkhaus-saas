// Add page_sections record
query page_sections verb=POST {
  input {
    dblink {
      table = "page_sections"
    }
  }

  stack {
    db.add page_sections {
      data = {created_at: "now"}
    } as $page_sections
  }

  response = $page_sections
}