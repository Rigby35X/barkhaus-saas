// Add linked_accounts record
query link verb=POST {
  input {
    dblink {
      table = "linked_accounts"
    }
  }

  stack {
    db.add linked_accounts {
      data = {
        created_at   : "now"
        org          : $input.org
        provider     : $input.provider
        auth_type    : $input.auth_type
        access_token : $input.access_token
        refresh_token: $input.refresh_token
        scope        : $input.scope
        expires_at   : $input.expires_at
        metadata     : $input.metadata
        updated_at   : $input.updated_at
      }
    } as $linked_accounts
  }

  response = $linked_accounts
}