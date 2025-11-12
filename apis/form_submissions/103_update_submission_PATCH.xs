// Update a form submission's status and admin notes
query "{id}" verb=PATCH {
  input {
    int id? filters=min:1
    dblink {
      table = ""
    }
  }

  stack {
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_input
  
    // Get the existing submission to check if it exists
    db.get "" {
      field_name = "id"
      field_value = $input.id
    } as $submission
  
    // Check if submission exists
    precondition ($submission != null) {
      error_type = "notfound"
      error = "Submission not found"
    }
  
    // If marking as replied, set replied_at timestamp
    conditional {
      if ($input.status == "replied") {
        var $replied_at {
          value = "now"
        }
      }
    }
  
    // Update the submission with provided fields
    db.patch "" {
      field_name = "id"
      field_value = $input.id
      data = `$input|pick:($raw_input|keys)`
        |filter_null
        |filter_empty_text
        |set:"updated_at":"now"
        |set:"replied_at":$replied_at
    } as $updated_submission
  }

  response = $updated_submission
}