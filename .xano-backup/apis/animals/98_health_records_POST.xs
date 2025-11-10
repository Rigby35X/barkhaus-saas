// Add Health Records record
query health_records verb=POST {
  input {
    dblink {
      table = "Health Records"
    }
  }

  stack {
    db.add "Health Records" {
      data = {
        created_at                  : $input.created_at
        Name                        : $input.Name
        Dog                         : $input.Dog
        Health_Check_Date           : $input.Health_Check_Date
        Veterinary_Approval         : $input.Veterinary_Approval
        Spay_Neuter_Status          : $input.Spay_Neuter_Status
        Vaccinations                : $input.Vaccinations
        Medical_Notes               : $input.Medical_Notes
        Health_Photos               : $input.Health_Photos
        Next_Checkup_Due            : $input.Next_Checkup_Due
        Allergies_Chronic_Conditions: $input.Allergies_Chronic_Conditions
        Upcoming_Checkup_in_Days    : $input.Upcoming_Checkup_in_Days
        Is_Overdue_for_Checkup      : $input.Is_Overdue_for_Checkup
      }
    } as $health_records
  }

  response = $health_records
}