// Update a form submission's status and admin notes
query "{id}" verb=PATCH {
  input {
    int id? filters=min:1
    text status?
    text admin_notes?
  }

  stack {
    // Get the existing submission to check if it exists
    db.get form_submissions {
      field_name = "id"
      field_value = $input.id
    } as $submission

    // Check if submission exists
    precondition ($submission != null) {
      error_type = "notfound"
      error = "Submission not found"
    }

    // Update the submission
    db.edit form_submissions {
      field_name = "id"
      field_value = $input.id
      data = {
        status: $input.status
        admin_notes: $input.admin_notes
        updated_at: "now"
        replied_at: ($input.status == "replied" ? "now" : $submission.replied_at)
      }
    } as $updated_submission
  }

  response = $updated_submission
}