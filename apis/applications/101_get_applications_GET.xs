// Get all applications for the admin dashboard
query applications verb=GET {
  input {
    int org_id?
    text application_type?
    text status?
    int limit?=50
    int offset?
  }

  stack {
    // Get applications with filters - MUST filter by org_id for security
    db.query applications {
      where = $db.applications.org ==? $input.org_id && $db.applications.application_type ==? $input.application_type && $db.applications.status ==? $input.status
      sort = {applications.submission_date: "desc"}
      return = {type: "list"}
    } as $result
  }

  response = $result
}
