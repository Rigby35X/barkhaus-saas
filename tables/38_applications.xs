table applications {
  auth = false

  schema {
    int id
    int org? { table = "organizations" }
    text application_type?
    int cognito_form_id?
    text cognito_entry_id?
    json form_data?
    text applicant_name?
    text applicant_email?
    text applicant_phone?
    text status?
    timestamp submission_date?
    text ip_address?
    text admin_notes?
    timestamp replied_at?
    int? replied_by? { table = "user" }
    timestamp created_at?
    timestamp updated_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "org"}]}
    {type: "btree", field: [{name: "application_type"}]}
    {type: "btree", field: [{name: "status"}]}
    {type: "btree", field: [{name: "submission_date", op: "desc"}]}
    {type: "btree", field: [{name: "cognito_form_id"}]}
  ]
}
