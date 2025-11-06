// Add Shelters record
query shelters verb=POST {
  input {
    dblink {
      table = "Shelters"
    }
  }

  stack {
    db.add Shelters {
      data = {
        created_at             : $input.created_at
        Shelter_Name           : $input.Shelter_Name
        Location               : $input.Location
        Contact_Name           : $input.Contact_Name
        Contact_Phone          : $input.Contact_Phone
        Contact_Email          : $input.Contact_Email
        Capacity               : $input.Capacity
        Photos                 : $input.Photos
        Notes                  : $input.Notes
        Dogs                   : $input.Dogs
        Current_Dog_Count      : $input.Current_Dog_Count
        Occupancy_Rate         : $input.Occupancy_Rate
        Most_Recent_Intake_Date: $input.Most_Recent_Intake_Date
        Adoptions              : $input.Adoptions
      }
    } as $shelters
  }

  response = $shelters
}