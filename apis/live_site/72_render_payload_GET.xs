query "render-payload" verb=GET {
  input {
    text slug? filters=trim
    text path? filters=trim
  }

  stack {
  }

  response = null
}