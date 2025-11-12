// Get all form submissions for the admin dashboard
query submissions verb=GET {
  input {
    int org_id?
    text form_type?
    text status?
    int limit?=50
    int offset?=0
  }

  stack {
    // Build the where clause - MUST filter by org_id for security
    var $where {
      value = $db.form_submissions.org == $input.org_id
    }

    // Add optional filters
    conditional {
      if ($input.form_type != null) {
        var.update $where {
          value = $where && $db.form_submissions.form_type == $input.form_type
        }
      }
    }

    conditional {
      if ($input.status != null) {
        var.update $where {
          value = $where && $db.form_submissions.status == $input.status
        }
      }
    }

    // Get submissions
    db.query form_submissions {
      where = $where
      sort = {form_submissions.submission_date: "desc"}
      return = {
        type  : "list"
        paging: {page: 1, per_page: $input.limit, metadata: true}
      }
    } as $result
  }

  response = $result
}
