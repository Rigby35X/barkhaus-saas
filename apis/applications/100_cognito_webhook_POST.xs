// Receive Cognito Forms webhook submissions
query "cognito-webhook" verb=POST {
  input {
    int org_id?
    int cognito_form_id?
    text cognito_entry_id?
  }

  stack {
    // Get the raw form data from Cognito
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $raw_data

    // Determine application type based on form ID
    var $app_type {
      value = ($input.cognito_form_id == 1 ? "adoption" : ($input.cognito_form_id == 2 ? "foster" : ($input.cognito_form_id == 5 ? "relinquishment" : "unknown")))
    }

    // Extract common fields from form data (Cognito Forms structure)
    var $applicant_name {
      value = $raw_data.Name ?: ($raw_data.FirstName + " " + $raw_data.LastName) ?: $raw_data.ApplicantName ?: ""
    }

    var $applicant_email {
      value = $raw_data.Email ?: $raw_data.EmailAddress ?: ""
    }

    var $applicant_phone {
      value = $raw_data.Phone ?: $raw_data.PhoneNumber ?: ""
    }

    // Save the application
    db.add applications {
      data = {
        org: $input.org_id
        application_type: $app_type
        cognito_form_id: $input.cognito_form_id
        cognito_entry_id: $input.cognito_entry_id ?: $raw_data.EntryId ?: $raw_data.Id
        form_data: $raw_data
        applicant_name: $applicant_name
        applicant_email: $applicant_email
        applicant_phone: $applicant_phone
        status: "new"
        submission_date: "now"
        created_at: "now"
        updated_at: "now"
      }
    } as $application

  }

  response = $application
}
