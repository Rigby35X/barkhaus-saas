// Update an application's status and admin notes
query "{id}" verb=PATCH {
  input {
    int id? filters=min:1
    text status?
    text admin_notes?
  }

  stack {
    // Get the existing application to check if it exists
    db.get applications {
      field_name = "id"
      field_value = $input.id
    } as $application

    // Check if application exists
    precondition ($application != null) {
      error_type = "notfound"
      error = "Application not found"
    }

    // Update the application
    db.edit applications {
      field_name = "id"
      field_value = $input.id
      data = {
        status: $input.status
        admin_notes: $input.admin_notes
        updated_at: "now"
        replied_at: ($input.status == "replied" ? "now" : $application.replied_at)
      }
    } as $updated_application
  }

  response = $updated_application
}
