query "ai/all" verb=POST {
  input {
    int organization_id? {
      table = "organizations"
    }
  }

  stack {
  }

  response = null
}