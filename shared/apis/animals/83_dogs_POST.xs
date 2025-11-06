// Add Dogs record
query dogs verb=POST {
  input {
    dblink {
      table = "Dogs"
    }
  }

  stack {
    db.add Dogs {
      data = {
        created_at                           : $input.created_at
        Code                                 : $input.Code
        Main_Photo                           : $input.Main_Photo
        Dog_Name                             : $input.Dog_Name
        Microchip_Number                     : $input.Microchip_Number
        Is_Dog_Fixed                         : $input.Is_Dog_Fixed
        Reason_for_Delay_in_Spaying_Neutering: $input.Reason_for_Delay_in_Spaying_Neutering
        Required_Spay_Neuter                 : $input.Required_Spay_Neuter
        SpayNeuterVoucher_Signature          : $input.SpayNeuterVoucher_Signature
        Spay_Neuter_Voucher_Date             : $input.Spay_Neuter_Voucher_Date
        Deposit_Waived                       : $input.Deposit_Waived
        Deposit_Received                     : $input.Deposit_Received
        Deposit_Returned                     : $input.Deposit_Returned
        Vaccinations                         : $input.Vaccinations
        Veterinary_Approval                  : $input.Veterinary_Approval
        Shelter                              : $input.Shelter
        Health                               : $input.Health
        Financial_Responsibility             : $input.Financial_Responsibility
        Microchip                            : $input.Microchip
        Bathing                              : $input.Bathing
        Introductions                        : $input.Introductions
        Food                                 : $input.Food
        Treats                               : $input.Treats
        Frozen_Marrow_Bones                  : $input.Frozen_Marrow_Bones
        Acceptable_Toys                      : $input.Acceptable_Toys
        Kennel                               : $input.Kennel
        Fecal_Test_Poop                      : $input.Fecal_Test_Poop
        Warning_Signs                        : $input.Warning_Signs
        Call_Us                              : $input.Call_Us
        AdoptionContract_Signature           : $input.AdoptionContract_Signature
        AdoptionContract_Date                : $input.AdoptionContract_Date
        Dog_s_Original_Name                  : $input.Dog_s_Original_Name
        Kennel_Shelter_ID_Information        : $input.Kennel_Shelter_ID_Information
        DogID                                : $input.DogID
        Litter_Name                          : $input.Litter_Name
        Chip_Manufacturer                    : $input.Chip_Manufacturer
        Registered                           : $input.Registered
        Pup_Birthday                         : $input.Pup_Birthday
        Pup_is_currently_this_many_weeks_old : $input.Pup_is_currently_this_many_weeks_old
        Estimated_Adoption_Date              : $input.Estimated_Adoption_Date
        Adoption_Date_Calculation            : $input.Adoption_Date_Calculation
        Today_s_Date                         : $input.Today_s_Date
        Intake_Date                          : $input.Intake_Date
        Gender                               : $input.Gender
        Estimated_Size_When_Grown            : $input.Estimated_Size_When_Grown
        Breed                                : $input.Breed
        Markings                             : $input.Markings
        My_Story                             : $input.My_Story
        Adoption_Record                      : $input.Adoption_Record
      }
    } as $dogs
  }

  response = $dogs
}