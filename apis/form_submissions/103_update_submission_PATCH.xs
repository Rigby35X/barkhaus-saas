// Update a form submission's status and admin notes
query "{id}" verb=PATCH {
  input {
    int id? filters=min:1 {
      description = "Form submission ID"
    }
    text status? {
      description = "New status: new, read, replied, archived"
    }
    text admin_notes? {
      description = "Admin notes about this submission"
    }
  }

  stack {
    // Get the existing submission
    db.get form_submissions {
      field_name = "id"
      field_value = $input.id
    } as $submission

    // Check if submission exists
    precondition ($submission != null) {
      error_type = "notfound"
      error = "Submission not found"
    }

    // Build update data
    var $update_data {
      value = {
        updated_at: "now"
      }
    }

    // Add status if provided
    conditional {
      if ($input.status != null) {
        var.update $update_data {
          value = $update_data|set:"status":$input.status
        }

        // If marking as replied, set replied_at timestamp
        conditional {
          if ($input.status == "replied") {
            var.update $update_data {
              value = $update_data|set:"replied_at":"now"
            }
          }
        }
      }
    }

    // Add admin_notes if provided
    conditional {
      if ($input.admin_notes != null) {
        var.update $update_data {
          value = $update_data|set:"admin_notes":$input.admin_notes
        }
      }
    }

    // Update the submission
    db.edit form_submissions {
      field_name = "id"
      field_value = $input.id
      data = $update_data
    } as $updated_submission
  }

  response = $updated_submission
}
