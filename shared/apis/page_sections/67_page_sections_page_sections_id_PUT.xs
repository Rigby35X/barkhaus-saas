// Update page_sections record
query "page_sections/{page_sections_id}" verb=PUT {
  input {
    int page_sections_id? filters=min:1
    dblink {
      table = "page_sections"
    }
  }

  stack {
    db.edit page_sections {
      field_name = "id"
      field_value = $input.page_sections_id
      data = {
        tenant_id    : $input.tenant_id
        section_name : $input.section_name
        is_enabled   : $input.is_enabled
        sort_order   : $input.sort_order
        content_json : $input.content_json
        custom_css   : $input.custom_css
        section_style: $input.section_style
      }
    } as $model
  }

  response = $model
}