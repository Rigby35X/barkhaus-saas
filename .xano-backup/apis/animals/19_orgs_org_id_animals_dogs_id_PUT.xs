// Update Dogs record
query "orgs/{orgId}/animals/{dogs_id}" verb=PUT {
  input {
    int dogs_id? filters=min:1
    dblink {
      table = "animals"
    }
  
    int orgId?
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
        intake_date: $input.intake_date
        image_url  : $input.image_url
        tenant_id  : $input.org_id
      }
    } as $model
  }

  response = $model
}