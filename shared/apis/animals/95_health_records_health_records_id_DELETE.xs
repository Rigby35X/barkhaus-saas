// Delete Health Records record.
query "health_records/{health_records_id}" verb=DELETE {
  input {
    int health_records_id? filters=min:1
  }

  stack {
    db.del "Health Records" {
      field_name = "id"
      field_value = $input.health_records_id
    }
  }

  response = null
}