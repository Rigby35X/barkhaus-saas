// Query all Shelters records
query shelters verb=GET {
  input {
  }

  stack {
    db.query Shelters {
      return = {type: "list"}
    } as $shelters
  }

  response = $shelters
}