query "ai/copy" verb=POST {
  input {
    int organization_id?=1 {
      table = "organizations"
    }
  }

  stack {
  }

  response = null
}