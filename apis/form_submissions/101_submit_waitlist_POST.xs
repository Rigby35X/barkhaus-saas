// POST /api/form_submissions/waitlist
// Submit a waitlist form from the marketing website

input {
  name: text [required]
  organization: text [required]
  email: text [required]
  website: text
  how_heard: text [required]
  animals_count: text
}

// Get request metadata
var ip_address = request.ip
var user_agent = request.headers["User-Agent"]

// Create the form submission
var submission = db_insert("form_submissions", {
  form_type: "waitlist",
  name: input.name,
  email: input.email,
  organization: input.organization,
  website: input.website,
  how_heard: input.how_heard,
  animals_count: input.animals_count,
  ip_address: ip_address,
  user_agent: user_agent,
  status: "new"
})

// Return success response
response(submission, 201)
