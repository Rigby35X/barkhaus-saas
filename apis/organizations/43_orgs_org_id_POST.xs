// Add organizations record
query "orgs/{orgId}" verb=POST {
  input {
    dblink {
      table = "organizations"
    }
  
    int orgId?=1
    text logo_url? filters=trim
  }

  stack {
    db.add organizations {
      data = {
        name          : $input.name
        email         : $input.email
        phone         : $input.phone
        address       : $input.address
        about_us      : $input.about_us
        website_url   : $input.website_url
        logo_light_url: $input.logo_url
        created_at    : "now"
      }
    } as $model
  }

  response = $model
}