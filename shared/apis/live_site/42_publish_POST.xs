query publish verb=POST {
  input {
    text pageSlug? filters=trim
    text tenant_id? filters=trim
  }

  stack {
  }

  response = '{"success": true}'
}