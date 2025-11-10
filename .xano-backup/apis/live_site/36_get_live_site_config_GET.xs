query "get-live-site-config" verb=GET {
  input {
    text slug? filters=trim
  }

  stack {
    db.get organizations {
      field_name = "slug"
      field_value = "Input.slug"
    } as $org
  
    db.get design_settings {
      field_name = "org"
      field_value = $org.id
    } as $design_settings
  
    db.get site_content {
      field_name = "org"
      field_value = $org.id
    } as $live_site
  }

  response = {
    site_content   : $live_site
    design_settings: $design_settings
    org            : $org
  }
}