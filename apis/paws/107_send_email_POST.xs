query "send-email" verb=POST {
  input {
    int animal_id?
    text email_to?
    text subject?
    int org?
  }

  stack {
    db.query mbpr_puppies {
      return = {
        type = "single"
        filter = {
          id = $input.animal_id
        }
      }
    } as $animal
  }

  response = {
    success: true
    animal: $animal
  }
}
