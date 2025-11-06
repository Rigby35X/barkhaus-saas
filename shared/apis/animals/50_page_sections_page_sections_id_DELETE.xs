// Delete page_sections record.
query "page_sections/{page_sections_id}" verb=DELETE {
  input {
    int page_sections_id? filters=min:1
  }

  stack {
    db.del page_sections {
      field_name = "id"
      field_value = $input.page_sections_id
    }
  }

  response = null
}