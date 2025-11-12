// Form Submissions Table for Marketing Site
// Stores all form submissions from barkhaus.io marketing website

table form_submissions {
  auth = false

  schema {
    int id

    // Organization (which company this submission is for)
    int org? {
      table = "organizations"
    }

    // Form identification
    text form_type?

    // Common fields
    text name?
    text email?
    text organization?

    // Contact form specific
    text message?

    // Waitlist form specific
    text website?
    text how_heard?
    text animals_count?

    // Metadata
    timestamp submission_date? default="NOW()"
    text status? default="new"
    text ip_address?
    text user_agent?

    // Admin fields
    text admin_notes?
    timestamp replied_at?
    int? replied_by? {
      table = "user"
    }

    timestamp created_at? default="NOW()"
    timestamp updated_at? default="NOW()"
  }

  indexes {
    [org, form_type, status, submission_date]
  }
}
