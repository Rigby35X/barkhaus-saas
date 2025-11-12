// POST /api/form_submissions/contact
// Submit a contact form from the marketing website

input {
  name: text [required]
  organization: text [required]
  email: text [required]
  message: text [required]
}

// Get request metadata
var ip_address = request.ip
var user_agent = request.headers["User-Agent"]

// Create the form submission
var submission = db_insert("form_submissions", {
  form_type: "contact",
  name: input.name,
  email: input.email,
  organization: input.organization,
  message: input.message,
  ip_address: ip_address,
  user_agent: user_agent,
  status: "new"
})

// Return success response
response(submission, 201)
