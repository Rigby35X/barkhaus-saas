// Add Dogs record
query dogs verb=POST {
  input {
    dblink {
      table = "animals"
    }
  }

  stack {
    db.add animals {
      data = {created_at: "now"}
    } as $dogs
  }

  response = $dogs
}