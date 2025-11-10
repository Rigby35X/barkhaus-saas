// Add Templates record
query templates verb=POST {
  input {
    dblink {
      table = "Templates"
    }
  }

  stack {
    db.add Templates {
      data = {created_at: "now"}
    } as $templates
  }

  response = $templates
}