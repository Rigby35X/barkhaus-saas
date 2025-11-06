// Query all Dogs records
query dogs verb=GET {
  input {
  }

  stack {
    db.query Dogs {
      return = {type: "list"}
    } as $dogs
  }

  response = $dogs
}