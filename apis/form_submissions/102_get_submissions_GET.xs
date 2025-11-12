// Get all form submissions for the admin dashboard
query submissions verb=GET {
  input {
    int org_id?
    text form_type?
    text status?
    int limit?=50
    int offset?
  }

  stack {
    // Get submissions with filters - MUST filter by org_id for security
    db.query form_submissions {
      where = $db.form_submissions.org ==? $input.org_id && $db.form_submissions.form_type ==? $input.form_type && $db.form_submissions.status ==? $input.status
      sort = {form_submissions.submission_date: "desc"}
      return = {type: "list"}
    } as $result
  }

  response = $result
}