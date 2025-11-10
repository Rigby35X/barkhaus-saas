// Query all site_content records
query site_content verb=GET {
  input {
  }

  stack {
    db.query site_content {
      return = {type: "list"}
    } as $model
  }

  response = $model
}