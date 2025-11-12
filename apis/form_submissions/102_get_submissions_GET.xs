// GET /api/form_submissions
// Get all form submissions for the admin dashboard

input {
  form_type: text // Optional filter: "contact" or "waitlist"
  status: text // Optional filter: "new", "read", "replied", "archived"
  limit: int [default: 50]
  offset: int [default: 0]
}

// Build the query
var query = {}

if (input.form_type != null) {
  query.form_type = input.form_type
}

if (input.status != null) {
  query.status = input.status
}

// Get submissions
var submissions = db_query("form_submissions", query)
  .sort("submission_date", "desc")
  .limit(input.limit)
  .offset(input.offset)

// Get total count for pagination
var total_count = db_count("form_submissions", query)

// Return results with pagination info
response({
  submissions: submissions,
  total: total_count,
  limit: input.limit,
  offset: input.offset
}, 200)
