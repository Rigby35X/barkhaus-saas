// Update a dog
query "orgs/{orgId}/animals/{dogs_id}" verb=PATCH {
  input {
    int dogs_id? filters=min:1
    dblink {
      table = "animals"
    }
  
    int? orgId? {
      table = "organizations"
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    db.patch animals {
      field_name = "id"
      field_value = $input.dogs_id
      data = `$input|pick:($raw_input|keys)`|filter_null|filter_empty_text
    } as $model
  }

  response = $model
}