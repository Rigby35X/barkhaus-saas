// Submit waitlist form from barkhaus.io marketing site
query "waitlist" verb=POST {
  input {
    text name?
    text organization?
    text email?
    text website?
    text how_heard?
    text animals_count?
  }

  stack {
    db.add form_submissions {
      data = {
        org           : 8
        form_type     : "waitlist"
        name          : $input.name
        email         : $input.email
        organization  : $input.organization
        website       : $input.website
        how_heard     : $input.how_heard
        animals_count : $input.animals_count
        status        : "new"
        submission_date: "now"
        created_at    : "now"
        updated_at    : "now"
      }
    } as $submission
  }

  response = $submission
}
