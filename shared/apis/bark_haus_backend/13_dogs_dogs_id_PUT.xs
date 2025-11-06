// Edit the dog with this ID, but only if it belongs to the user’s org.
// 
// 
query "dogs/{dogs_id}" verb=PUT {
  input {
    int dogs_id? filters=min:1
    dblink {
      table = "animals"
    }
  }

  stack {
    db.edit animals {
      field_name = "id"
      field_value = $input.dogs_id
      data = {
        name       : $input.name
        breed      : $input.breed
        age        : $input.age
        description: $input.description
        status     : $input.status
        image_url  : $input.image_url
      }
    } as $model
  }

  response = $model
}