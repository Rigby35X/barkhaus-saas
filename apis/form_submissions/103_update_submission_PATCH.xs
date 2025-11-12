// PATCH /api/form_submissions/{id}
// Update a form submission's status and admin notes

input {
  id: int [required, path]
  status: text
  admin_notes: text
}

// Get the existing submission
var submission = db_get("form_submissions", input.id)

if (submission == null) {
  response({
    error: "Submission not found"
  }, 404)
}

// Update fields
var updates = {}

if (input.status != null) {
  updates.status = input.status

  // If marking as replied, set replied_at timestamp
  if (input.status == "replied") {
    updates.replied_at = NOW()
  }
}

if (input.admin_notes != null) {
  updates.admin_notes = input.admin_notes
}

// Always update the updated_at timestamp
updates.updated_at = NOW()

// Update the submission
var updated_submission = db_update("form_submissions", input.id, updates)

// Return updated submission
response(updated_submission, 200)
