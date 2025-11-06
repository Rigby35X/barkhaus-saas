// Query all design_settings records
query design_settings verb=GET {
  input {
  }

  stack {
    db.query design_settings {
      return = {type: "list"}
    } as $design_settings
  }

  response = $design_settings
}