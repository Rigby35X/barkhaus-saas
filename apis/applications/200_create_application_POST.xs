// Create a new application submission
query applications verb=POST {
  input {
    int org_id?
  }

  stack {
    // Get the raw application data from request body
    util.get_raw_input {
      encoding = "json"
      exclude_middleware = false
    } as $app_data
  
    // Extract the key fields
    var $app_type {
      value = $app_data.application_type|first_notnull:"unknown"
    }

    var $applicant_name {
      value = $app_data.applicant_name|first_notnull:""
    }

    var $applicant_email {
      value = $app_data.applicant_email|first_notnull:""
    }

    var $applicant_phone {
      value = $app_data.applicant_phone|first_notnull:""
    }

    // Use provided entry ID or generate a simple one
    var $entry_id {
      value = $app_data.cognito_entry_id
    }

    conditional {
      if ($entry_id == null) {
        security.create_uuid as $generated_uuid

        var.update $entry_id {
          value = $generated_uuid
        }
      }
    }

    // Extract cognito form ID if provided (for Excel imports)
    var $cognito_form_id {
      value = $app_data.cognito_form_id
    }

    // Extract adoption code directly from app_data
    var $adoption_code {
      value = $app_data.adoption_code|first_notnull:""
    }

    // Extract submission date directly from app_data
    var $submission_date {
      value = $app_data.submission_date|first_notnull:"now"
    }

    var $form_data {
      value = $app_data.form_data|first_notnull:$app_data
    }

    // Extract status (use provided status or default to "new")
    var $status {
      value = $app_data.status|first_notnull:"new"
    }

    // Save the application
    db.add applications {
      data = {
        org             : $input.org_id
        application_type: $app_type
        cognito_form_id : $cognito_form_id
        cognito_entry_id: $entry_id
        form_data       : $form_data
        applicant_name  : $applicant_name
        applicant_email : $applicant_email
        applicant_phone : $applicant_phone
        adoption_code   : $adoption_code
        status          : $status
        submission_date : $submission_date
        created_at      : "now"
        updated_at      : "now"
      }
    } as $application
  }

  response = $application
}