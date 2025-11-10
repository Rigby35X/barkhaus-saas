// Update organizations record
query "orgs/{orgid}" verb=PUT {
  input {
    dblink {
      table = "organizations"
    }
  
    int id? {
      table = "organizations"
    }
  
    text orgId? filters=trim
  }

  stack {
    db.edit organizations {
      field_name = "id"
      field_value = $auth.id
      data = {
        name          : $input.name
        email         : $input.email
        phone         : $input.phone
        address       : $input.address
        about_us      : $input.about_us
        website_url   : $input.website_url
        logo_light_url: $input.logo_url
      }
    } as $model
  }

  response = $model
}