// Update website_content record
query "website_content/{website_content_id}" verb=PUT {
  input {
    int website_content_id?=1 filters=min:1
    dblink {
      table = "website_content"
    }
  }

  stack {
    db.edit website_content {
      field_name = "id"
      field_value = $input.website_content_id
      data = {
        org_id              : $input.org_id
        page_slug           : $input.page_slug
        section_key         : $input.section_key
        headline            : $input.headline
        subheadline         : $input.subheadline
        body_text           : $input.body_text
        button_text         : $input.button_text
        button_link         : $input.button_link
        background_image_url: $input.background_image_url
        featured_image_url  : $input.featured_image_url
        secondary_image_url : $input.secondary_image_url
        is_visible          : $input.is_visible
        sort_order          : $input.sort_order
        updated_at          : $input.updated_at
      }
    } as $model
  }

  response = $model
}