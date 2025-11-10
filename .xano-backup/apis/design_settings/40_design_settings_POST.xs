// Add design_settings record
query design_settings verb=POST {
  input {
    dblink {
      table = "design_settings"
    }
  }

  stack {
    db.add design_settings {
      data = {created_at: "now"}
    } as $design_settings
  }

  response = $design_settings
}