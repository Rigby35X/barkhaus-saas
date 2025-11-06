query site_config verb=GET {
  input {
    dblink {
      table = "site_config"
      override = {created_at: {hidden: true}}
    }
  }

  stack {
    db.query site_config {
      return = {type: "list"}
    } as $model
  }

  response = $model
}