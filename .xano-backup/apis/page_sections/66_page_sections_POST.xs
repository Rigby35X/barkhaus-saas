// Add page_sections record
query page_sections verb=POST {
  input {
    dblink {
      table = "page_sections"
    }
  }

  stack {
    db.add page_sections {
      data = {
        created_at   : "now"
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