// Form Submissions Table for Marketing Site
// Stores all form submissions from the marketing website (contact, waitlist, etc.)

table("form_submissions") {
  id: int [pk, auto]

  // Organization (which company/rescue this submission is for)
  org_id: int [ref: organizations.id, required] // Should be 8 for Barkhaus marketing site

  // Form identification
  form_type: text [required] // "contact" or "waitlist"

  // Common fields (present in both forms)
  name: text [required]
  email: text [required]
  organization: text [required]

  // Contact form specific
  message: text // Only for contact form

  // Waitlist form specific
  website: text // Optional for waitlist
  how_heard: text // How they heard about us
  animals_count: text // Number of animals per year

  // Metadata
  submission_date: timestamp [default: "NOW()"]
  status: text [default: "new"] // "new", "read", "replied", "archived"
  ip_address: text
  user_agent: text

  // Admin notes
  admin_notes: text
  replied_at: timestamp
  replied_by: int [ref: user.id]

  created_at: timestamp [default: "NOW()"]
  updated_at: timestamp [default: "NOW()"]

  indexes {
    (form_type)
    (status)
    (submission_date)
    (email)
  }
}
