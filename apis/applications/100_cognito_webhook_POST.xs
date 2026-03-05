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
    // Try various field name patterns from different Cognito form exports
    var $applicant_name {
      value = $raw_data.Name
        |first_notempty:($raw_data.FirstName|concat:$raw_data.LastName:" ")
        |first_notempty:($raw_data.AboutYou2_Name_First
          |concat:$raw_data.AboutYou2_Name_Last:" "
        )
        |first_notempty:$raw_data.ApplicantName
        |first_notempty:""
    }
  
    var $applicant_email {
      value = $raw_data.Email
        |first_notempty:$raw_data.EmailAddress
        |first_notempty:$raw_data.AboutYou2_Email
        |first_notempty:""
    }
  
    var $applicant_phone {
      value = $raw_data.Phone
        |first_notempty:$raw_data.PhoneNumber
        |first_notempty:$raw_data.AboutYou2_CellPhone
        |first_notempty:""
    }
  
    // Save the application
    db.add applications {
      data = {
        org             : $input.org_id
        application_type: $app_type
        cognito_form_id : $input.cognito_form_id
        cognito_entry_id: $input.cognito_entry_id ?: $raw_data.EntryId ?: $raw_data.Id
        form_data       : $raw_data
        applicant_name  : $applicant_name
        applicant_email : $applicant_email
        applicant_phone : $applicant_phone
        status          : "new"
        submission_date : "now"
        created_at      : "now"
        updated_at      : "now"
      }
    } as $application
  }

  response = $application
}