// Query all Dogs records
query dogs verb=GET {
  input {
  }

  stack {
    db.query animals {
      return = {type: "list"}
    } as $dogs
  }

  response = $dogs
}