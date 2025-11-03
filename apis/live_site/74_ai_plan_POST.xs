query "ai/plan" verb=POST {
  input {
    int organization_id? {
      table = "organizations"
    }
  }

  stack {
  }

  response = null
}