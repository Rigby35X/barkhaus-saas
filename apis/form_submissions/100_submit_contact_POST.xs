// Submit contact form from barkhaus.io marketing site
query contact verb=POST {
  input {
    text name?
    text organization?
    text email?
    text message?
  }

  stack {
    db.add form_submissions {
      data = {
        org            : 8
        form_type      : "contact"
        name           : $input.name
        email          : $input.email
        organization   : $input.organization
        message        : $input.message
        status         : "new"
        submission_date: "now"
        created_at     : "now"
        updated_at     : "now"
      }
    } as $submission
  }

  response = $submission
}