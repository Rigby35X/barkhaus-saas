// Query all services records
query services verb=GET {
  input {
  }

  stack {
    db.query services {
      return = {type: "list"}
    } as $services
  }

  response = $services
}